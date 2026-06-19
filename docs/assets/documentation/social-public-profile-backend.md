# Social Public Profile Backend

## Purpose

The public profile is the public-safe social and model surface for one canonical profile model. It does not create additional models; it exposes owner-approved model access, interaction readiness, public links, follower state, subscription state, and feed engagement.

## Owner Files

- Public profile sections: `docs/assets/fragments/layers/website/profile/public/profile-sections.html`
- Public profile binding: `docs/assets/js/layers/website/profile/public/sections/profile-sections.js`
- Public profile runtime state: `docs/assets/js/layers/website/profile/private/shell/profile-runtime.js`
- Feed social state store: `docs/assets/js/layers/website/system/feed/feed-social-store.js`
- Profile social graph store: `docs/assets/js/layers/website/system/profile/profile-social-graph.js`
- Supabase migration: `supabase/migrations/202606190001_social_profile_public_backend.sql`

## Backend Tables

| Table | Role |
| --- | --- |
| `feed_post_interactions` | Existing like, repost, bookmark, and share state. |
| `feed_post_comments` | Existing published feed comment state. |
| `feed_post_views` | New aggregate view events for public feed metrics. |
| `profile_follows` | New public social graph follow relationships. |
| `profile_subscriptions` | New public subscription relationships and state. |

The migration also tightens the existing interaction and comment write policies: the authenticated user must own the referenced `profiles.id`, not only submit a matching auth UUID.

## UI Contract

Public profile sections bind to runtime fields only:

- `modelAccessLabel`
- `modelInteractionLabel`
- `modelReadinessLabel`
- `publicLinks`
- `publicProfileEnabled`
- `publicProfileDiscoverable`

Social graph state is hydrated through `profile-social-graph.js`; feed post counts and comments are hydrated through `feed-social-store.js`.

## Supabase Verification

Run after applying the migration:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'feed_post_interactions',
    'feed_post_comments',
    'feed_post_views',
    'profile_follows',
    'profile_subscriptions'
  )
order by table_name;
```

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('feed_post_views', 'profile_follows', 'profile_subscriptions')
order by tablename, policyname;
```

```sql
select
  (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'feed_post_views') as feed_post_view_indexes,
  (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'profile_follows') as profile_follow_indexes,
  (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'profile_subscriptions') as profile_subscription_indexes;
```

## Integration Notes

The frontend gracefully reports missing social tables as unavailable, so the public profile remains renderable before the migration is applied. After the migration is live, follow/subscription buttons and feed actions hydrate from Supabase and dispatch `profile:social-graph-changed`, `profile:subscription-changed`, and `feed:social-state-changed` for local refresh.
