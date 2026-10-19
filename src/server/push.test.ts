import { execFileSync } from "node:child_process";
import { createECDH, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import https from "node:https";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import webpush from "web-push";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Exercises the real web-push stack (VAPID signing + RFC 8291 payload encryption) against a local
 * HTTPS server that plays the role of a browser vendor's push service.
 */
const vapid = webpush.generateVAPIDKeys();
vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", vapid.publicKey);
vi.stubEnv("VAPID_PRIVATE_KEY", vapid.privateKey);
vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");

interface Hit { path: string; headers: Record<string, string | string[] | undefined>; body: Buffer }
const hits: Hit[] = [];
let server: https.Server;
let base = "";
let dir = "";
const previousTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

function subscriptionKeys() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") };
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "us-push-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(dir, "k.pem"), "-out", join(dir, "c.pem"), "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  server = https.createServer({ key: readFileSync(join(dir, "k.pem")), cert: readFileSync(join(dir, "c.pem")) }, (req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      hits.push({ path: req.url ?? "", headers: req.headers, body: Buffer.concat(chunks) });
      res.statusCode = req.url?.startsWith("/gone") ? 410 : req.url?.startsWith("/boom") ? 500 : 201;
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `https://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  rmSync(dir, { recursive: true, force: true });
  if (previousTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTls;
});

/** Minimal in-memory stand-in for the Supabase admin client's chained query builder. */
function fakeAdmin(rows: Array<Record<string, unknown>>) {
  const log = { deleted: [] as string[], updated: [] as Array<{ id: string; values: Record<string, unknown> }> };
  const client = {
    from: () => ({
      select: () => ({ eq: async () => ({ data: rows, error: null }) }),
      update: (values: Record<string, unknown>) => ({ eq: async (_c: string, id: string) => { log.updated.push({ id, values }); return { error: null }; } }),
      delete: () => ({ eq: async (_c: string, id: string) => { log.deleted.push(id); return { error: null }; } }),
    }),
  };
  return { client: client as never, log };
}

const payload = { title: "US", body: "You have a letter waiting for you.", tag: "message-1", url: "/letters/1", icon: "/i.png", badge: "/b.png" };

describe("sendPushToUser", () => {
  it("sends an encrypted, VAPID-signed push and records success", async () => {
    const { sendPushToUser } = await import("./push");
    hits.length = 0;
    const { client, log } = fakeAdmin([{ id: "s1", endpoint: `${base}/ok`, ...subscriptionKeys(), failure_count: 0 }]);
    const outcome = await sendPushToUser(client, "user-1", payload);
    expect(outcome).toEqual({ status: "sent", attempted: 1, accepted: 1 });
    const hit = hits[0]!;
    expect(String(hit.headers.authorization)).toMatch(/^vapid t=.+, k=.+$/);
    expect(hit.headers["content-encoding"]).toBe("aes128gcm");
    expect(hit.headers.ttl).toBe("86400");
    expect(hit.body.length).toBeGreaterThan(80);
    expect(hit.body.toString("utf8")).not.toContain("letter waiting"); // ciphertext, not plaintext
    expect(log.updated[0]?.id).toBe("s1");
  });

  it("removes subscriptions the push service reports as gone (410)", async () => {
    const { sendPushToUser } = await import("./push");
    const { client, log } = fakeAdmin([{ id: "gone1", endpoint: `${base}/gone`, ...subscriptionKeys(), failure_count: 0 }]);
    const outcome = await sendPushToUser(client, "user-1", payload);
    expect(outcome).toEqual({ status: "failed", attempted: 1, accepted: 0 });
    expect(log.deleted).toEqual(["gone1"]);
  });

  it("counts transient failures and prunes after repeated ones", async () => {
    const { sendPushToUser } = await import("./push");
    const first = fakeAdmin([{ id: "b1", endpoint: `${base}/boom`, ...subscriptionKeys(), failure_count: 0 }]);
    await sendPushToUser(first.client, "user-1", payload);
    expect(first.log.updated[0]?.values).toEqual({ failure_count: 1 });
    expect(first.log.deleted).toEqual([]);
    const last = fakeAdmin([{ id: "b2", endpoint: `${base}/boom`, ...subscriptionKeys(), failure_count: 4 }]);
    await sendPushToUser(last.client, "user-1", payload);
    expect(last.log.deleted).toEqual(["b2"]);
  });

  it("reaches every device of the user and succeeds if at least one accepts", async () => {
    const { sendPushToUser } = await import("./push");
    hits.length = 0;
    const { client } = fakeAdmin([
      { id: "d1", endpoint: `${base}/ok`, ...subscriptionKeys(), failure_count: 0 },
      { id: "d2", endpoint: `${base}/gone`, ...subscriptionKeys(), failure_count: 0 },
    ]);
    const outcome = await sendPushToUser(client, "user-1", payload);
    expect(outcome).toEqual({ status: "sent", attempted: 2, accepted: 1 });
    expect(hits).toHaveLength(2);
  });

  it("reports when the user has no subscriptions", async () => {
    const { sendPushToUser } = await import("./push");
    expect(await sendPushToUser(fakeAdmin([]).client, "user-1", payload)).toEqual({ status: "no_subscriptions" });
  });
});
