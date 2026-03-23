"use client";

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/client';
import type { FarmerProfileResponse } from '@/lib/farmer-profile-shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, Maximize2, Sprout, Droplets, Mountain, Save, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function profilePayload(profile: FarmerProfileResponse) {
  return {
    personal: profile.personal,
    land: profile.land,
    season: profile.season,
    schemes: profile.schemes,
    alerts: profile.alerts,
    consent: {
      shareAnalysisData: profile.consent.shareAnalysisData,
      shareMarketData: profile.consent.shareMarketData,
      allowAdvisorAccess: profile.consent.allowAdvisorAccess,
    },
  };
}

export default function FarmerProfilePage() {
  const { user, isUserLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<FarmerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      navigate('/login');
      return;
    }

    if (!user) return;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/profile', { method: 'GET', credentials: 'include', cache: 'no-store' });
        const body = await response.json().catch(() => ({}));

        if (!response.ok || !body?.profile) {
          throw new Error(body?.error || 'Unable to load profile');
        }

        setProfile(body.profile as FarmerProfileResponse);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Profile load failed',
          description: error?.message || 'Please refresh and try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [isUserLoading, navigate, toast, user]);

  const saveProfile = async () => {
    if (!profile) return;
    try {
      setIsSaving(true);
      const response = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload(profile)),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body?.profile) {
        throw new Error(body?.error || 'Unable to save profile');
      }

      setProfile(body.profile as FarmerProfileResponse);
      toast({ title: 'Profile saved', description: 'Your farmer profile is updated.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.message || 'Could not save profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || isLoading || !profile || !user) {
    return (
      <div className="space-y-6 animate-in fade-in max-w-5xl">
        <Skeleton className="h-10 w-64 bg-primary/10" />
        <Skeleton className="h-4 w-96 bg-[#1A1D1D]" />
        <Card className="bg-[#1A1D1D] border-white/10 mt-6">
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-8 w-40 bg-white/5" />
            <div className="grid grid-cols-2 gap-6">
              <Skeleton className="h-16 w-full bg-white/5" />
              <Skeleton className="h-16 w-full bg-white/5" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Farmer Profile
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
            Fine-tune your farm context to unlock highly personalized AI recommendations and yield optimization strategies.
          </p>
        </div>
        <div className="hidden md:block">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1 flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Context Sync
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal & Location */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-[#0E1111]/60 backdrop-blur-xl border-white/5 shadow-2xl overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <User size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg">Personal Identity</CardTitle>
                  <CardDescription>How the AI refers to you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 ml-1">Full Name</label>
                <div className="relative group/input">
                  <Input
                    value={profile.personal.fullName}
                    onChange={e => setProfile({ ...profile, personal: { ...profile.personal, fullName: e.target.value } })}
                    placeholder="e.g. Ravi Kumar"
                    className="bg-white/5 border-white/10 focus-visible:ring-emerald-500/50 h-12 pl-4 transition-all group-hover/input:border-white/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-1.5">
                    <MapPin size={12} /> Regional Location
                </label>
                <Input
                  value={profile.personal.district}
                  onChange={e => setProfile({ ...profile, personal: { ...profile.personal, district: e.target.value } })}
                  placeholder="e.g. Mysuru, Karnataka"
                  className="bg-white/5 border-white/10 focus-visible:ring-emerald-500/50 h-12 pl-4 transition-all group-hover/input:border-white/20"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-white/5 overflow-hidden relative">
             <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
                <Sprout size={160} />
             </div>
             <CardContent className="p-6">
                <h3 className="font-semibold text-emerald-400 mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   Providing accurate field details improves disease detection and yield forecasting accuracy by up to <span className="text-white font-bold">40%</span>.
                </p>
             </CardContent>
          </Card>
        </div>

        {/* Right Column: Farm Specs */}
        <div className="lg:col-span-2">
          <Card className="bg-[#0E1111]/60 backdrop-blur-xl border-white/5 shadow-2xl overflow-hidden h-full">
            <CardHeader className="border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
                  <Mountain size={20} />
                </div>
                <div>
                  <CardTitle>Agronomic Context</CardTitle>
                  <CardDescription>Environmental and land parameters for precision modeling</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                    <Maximize2 size={14} className="text-teal-500" /> Land Size (Acres)
                  </label>
                  <Input
                    type="number"
                    value={profile.land.landAreaAcres ?? ''}
                    onChange={e => {
                      const raw = e.target.value;
                      const parsed = raw === '' ? null : Number(raw);
                      setProfile({
                        ...profile,
                        land: { ...profile.land, landAreaAcres: Number.isNaN(parsed) ? null : parsed },
                      });
                    }}
                    className="bg-white/5 border-white/10 focus-visible:ring-emerald-500/50 h-14 text-lg font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground/50 italic px-1">Total operational holding area.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                    <Mountain size={14} className="text-amber-500" /> Soil Classification
                  </label>
                  <div className="relative">
                    <select
                      value={profile.land.soilType}
                      onChange={e => setProfile({ ...profile, land: { ...profile.land, soilType: e.target.value } })}
                      className="flex h-14 w-full rounded-md border border-white/10 bg-white/5 px-4 py-2 text-base ring-offset-background appearance-none focus:border-emerald-500/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Loam">Rich Loam</option>
                      <option value="Clay">Hard Clay</option>
                      <option value="Sand">Granular Sand</option>
                      <option value="Silt">Fine Silt</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50">
                        <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                    <Sprout size={14} className="text-emerald-500" /> Active Primary Crop
                  </label>
                  <div className="relative">
                    <select
                      value={profile.season.cropName}
                      onChange={e => setProfile({ ...profile, season: { ...profile.season, cropName: e.target.value } })}
                      className="flex h-14 w-full rounded-md border border-white/10 bg-white/5 px-4 py-2 text-base ring-offset-background appearance-none focus:border-emerald-500/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Tomato">Tomato (Processing/Table)</option>
                      <option value="Corn">Sweet Corn / Maize</option>
                      <option value="Wheat">Winter Wheat</option>
                      <option value="Soybean">Elite Soybean</option>
                      <option value="Onion">Red Onion</option>
                      <option value="Chilli">Guntur Chilli</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50">
                        <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                    <Droplets size={14} className="text-blue-500" /> Water Management
                  </label>
                  <div className="relative">
                    <select
                      value={profile.land.irrigationType}
                      onChange={e => setProfile({ ...profile, land: { ...profile.land, irrigationType: e.target.value } })}
                      className="flex h-14 w-full rounded-md border border-white/10 bg-white/5 px-4 py-2 text-base ring-offset-background appearance-none focus:border-emerald-500/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Drip">Modern Drip Irrigation</option>
                      <option value="Canal">Canal / Surface Water</option>
                      <option value="Rainfed">Natural Rainfed Only</option>
                      <option value="Borewell">Groundwater / Borewell</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50">
                        <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 gap-4">
                 <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-full",
                        isSaving ? "bg-emerald-500/10" : "bg-white/5"
                    )}>
                        <Save size={18} className={cn(isSaving ? "text-emerald-400 animate-bounce" : "text-muted-foreground")} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Your changes will be saved to the AgriNexus Intelligence Engine.
                    </p>
                 </div>
                 <Button
                    onClick={saveProfile}
                    disabled={isSaving}
                    className="h-14 px-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] w-full md:w-auto overflow-hidden relative group"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                        {isSaving ? 'Syncing Profile...' : 'Update Context'}
                        {!isSaving && <ChevronRight size={18} />}
                    </span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                  </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

