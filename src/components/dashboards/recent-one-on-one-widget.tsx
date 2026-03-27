"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole, type Role } from '@/hooks/use-role';
import { getOneOnOneHistory, OneOnOneHistoryItem } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Check, CheckSquare, MessageSquare, Star } from 'lucide-react';
import Link from 'next/link';

export default function RecentOneOnOneWidget() {
  // This component is no longer used on the dashboard but is kept for potential future use.
  return null;
}
