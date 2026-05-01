-- Migration: Enable Supabase Realtime on announcements table
-- Run this in the Supabase SQL Editor

-- Enable realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
