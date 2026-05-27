-- Neuroartan accessibility settings persistence
-- Adds accessibility settings to the profiles table for production-ready persistence
-- Settings will be stored in the user profile and loaded on page initialization

-- Note: This migration has already been applied manually. The SQL below is for reference.
-- PostgreSQL does not support IF NOT EXISTS for ADD CONSTRAINT, so constraints
-- were added individually after the columns were added.

alter table public.profiles
  add column if not exists accessibility_typography text not null default 'large',
  add column if not exists accessibility_density text not null default 'standard',
  add column if not exists accessibility_motion text not null default 'enabled',
  add column if not exists accessibility_aria_announcements boolean not null default false,
  add column if not exists accessibility_icon_size text not null default 'large';

-- Add check constraints to ensure valid values
-- Note: Run these individually if re-applying this migration
alter table public.profiles
  add constraint accessibility_typography_check 
    check (accessibility_typography in ('small', 'medium', 'large', 'extra-large'));

alter table public.profiles
  add constraint accessibility_density_check 
    check (accessibility_density in ('compact', 'standard', 'comfortable'));

alter table public.profiles
  add constraint accessibility_motion_check 
    check (accessibility_motion in ('enabled', 'reduced'));

alter table public.profiles
  add constraint accessibility_icon_size_check 
    check (accessibility_icon_size in ('small', 'medium', 'large'));

-- Update existing profiles with default values
update public.profiles
set
  accessibility_typography = coalesce(accessibility_typography, 'medium'),
  accessibility_density = coalesce(accessibility_density, 'standard'),
  accessibility_motion = coalesce(accessibility_motion, 'enabled'),
  accessibility_aria_announcements = coalesce(accessibility_aria_announcements, false),
  accessibility_icon_size = coalesce(accessibility_icon_size, 'medium')
where accessibility_typography is null 
   or accessibility_density is null 
   or accessibility_motion is null 
   or accessibility_aria_announcements is null 
   or accessibility_icon_size is null;
