-- Where a photo was taken, for the map in the albums. Optional, and only the two of you can see it.

alter table public.photos
  add column lat   double precision check (lat is null or lat between -90 and 90),
  add column lng   double precision check (lng is null or lng between -180 and 180),
  add column place text check (place is null or char_length(place) <= 120),
  add constraint photos_lat_lng_together check ((lat is null) = (lng is null));

grant insert (lat, lng, place) on public.photos to authenticated;
grant update (lat, lng, place) on public.photos to authenticated;
