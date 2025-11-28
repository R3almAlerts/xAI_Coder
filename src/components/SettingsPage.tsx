// src/components/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useSupabase } from '../integrations/supabase/supabase';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const supabase = useSupabase();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      setDisplayName(user.fullName || user.primaryEmailAddress?.emailAddress.split('@')[0] || '');
      setCurrentLogoUrl(user.imageUrl || '');
      setLogoPreview(user.imageUrl || '');
    }
  }, [user, isLoaded]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setLogoFile(file);
    setUploadSuccess(false);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(currentLogoUrl);
    setUploadSuccess(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;

    setIsUploading(true);

    try {
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}.${fileExt || 'png'}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-assets')
        .upload(filePath, logoFile, {
          upsert: true,
          contentType: logoFile.type,
        });

      if (error && error.message !== 'The resource already exists') {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-assets')
        .getPublicUrl(filePath);

      // Update Clerk user metadata
      await user.update({
        imageUrl: publicUrl,
        unsafeMetadata: {
          ...user.unsafeMetadata,
          custom_avatar: publicUrl,
        },
      });

      setCurrentLogoUrl(publicUrl);
      setUploadSuccess(true);
      toast.success('Logo uploaded successfully!');
      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload logo');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);

    try {
      let finalLogoUrl = currentLogoUrl;

      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          finalLogoUrl = uploadedUrl;
        }
      }

      // Update display name if changed
      if (displayName !== (user.fullName || '')) {
        await user.update({
          firstName: displayName.split(' ')[0],
          lastName: displayName.split(' ').slice(1).join(' ') || '',
        });
      }

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error('Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        <Button 
          onClick={saveProfile} 
          disabled={isSavingProfile || (isUploading && !!logoFile)}
        >
          {(isSavingProfile || (isUploading && !!logoFile)) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your display name and logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label>Logo</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={logoPreview || currentLogoUrl} />
                    <AvatarFallback className="text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => inputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Image
                      </Button>

                      {logoFile && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeLogo}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          {uploadSuccess && (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {logoFile && (
                      <p className="text-sm text-muted-foreground">
                        {logoFile.name} ({(logoFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Recommended: Square image, max 5MB
                    </p>

                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading logo...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Email: {user.primaryEmailAddress?.emailAddress}
              </div>
              <Button variant="destructive" onClick={() => signOut()}>
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}