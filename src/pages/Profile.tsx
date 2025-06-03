
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { User, Edit, Save, Camera, MapPin, Phone, Mail, Globe, Moon, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export default function Profile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { theme, language, toggleTheme, setLanguage } = useTheme();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: '',
    username: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('No user ID found');
      }

      // First try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Profile fetch error:', fetchError);
        throw fetchError;
      }
      
      // If no profile exists, create one with user data
      if (!existingProfile) {
        const newProfile = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          role: user.user_metadata?.role || 'patient',
          username: user.user_metadata?.username || null,
          phone: user.user_metadata?.phone || '',
          country: user.user_metadata?.country || '',
          avatar_url: user.user_metadata?.avatar_url || ''
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error('Profile creation error:', createError);
          throw createError;
        }

        setProfile(createdProfile);
        setFormData({
          first_name: createdProfile.first_name || '',
          last_name: createdProfile.last_name || '',
          email: createdProfile.email || user?.email || '',
          phone: createdProfile.phone || '',
          country: createdProfile.country || '',
          username: createdProfile.username || '',
          avatar_url: createdProfile.avatar_url || ''
        });
      } else {
        setProfile(existingProfile);
        setFormData({
          first_name: existingProfile.first_name || '',
          last_name: existingProfile.last_name || '',
          email: existingProfile.email || user?.email || '',
          phone: existingProfile.phone || '',
          country: existingProfile.country || '',
          username: existingProfile.username || '',
          avatar_url: existingProfile.avatar_url || ''
        });
      }
    } catch (error: any) {
      console.error('Error fetching/creating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);
      
      if (error) throw error;
      
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === language);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('profile')}</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">{t('personalInfo')}</TabsTrigger>
            <TabsTrigger value="medical">{t('medicalInfo')}</TabsTrigger>
            <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                        <AvatarImage src={formData.avatar_url || profile?.avatar_url} />
                        <AvatarFallback className="text-lg bg-emerald-100 text-emerald-700 font-semibold">
                          {(formData.first_name || profile?.first_name)?.[0] || 'U'}{(formData.last_name || profile?.last_name)?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                        title={t('uploadPhoto')}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl">
                        {(formData.first_name || profile?.first_name || 'User')} {(formData.last_name || profile?.last_name || '')}
                      </CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                        <Badge variant="secondary" className="w-fit">
                          {profile?.role || 'patient'}
                        </Badge>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4 mr-1" />
                          {formData.email || profile?.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                    {isEditing ? t('saveChanges') : t('editProfile')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('firstName')}</Label>
                    <Input
                      id="firstName"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      disabled={!isEditing}
                      placeholder={t('enterFirstName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('lastName')}</Label>
                    <Input
                      id="lastName"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      disabled={!isEditing}
                      placeholder={t('enterLastName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">{t('username')}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      disabled={!isEditing}
                      placeholder={t('enterUsername')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      placeholder={t('enterEmail')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('phone')}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">{t('country')}</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Enter country"
                    />
                  </div>
                </div>
                
                {!isEditing && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Contact Information</h4>
                    <div className="space-y-2">
                      {formData.phone && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <Phone className="w-4 h-4 mr-2" />
                          {formData.phone}
                        </div>
                      )}
                      {formData.country && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <MapPin className="w-4 h-4 mr-2" />
                          {formData.country}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle>{t('medicalInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Medical Records
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Medical information features coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-5 h-5" />
                    <span className="font-medium">{t('language')}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-48">
                        <span className="mr-2">{currentLanguage?.flag}</span>
                        {currentLanguage?.name}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {languages.map((lang) => (
                        <DropdownMenuItem 
                          key={lang.code}
                          onClick={() => setLanguage(lang.code as any)}
                          className={language === lang.code ? 'bg-emerald-50 dark:bg-emerald-900' : ''}
                        >
                          <span className="mr-2">{lang.flag}</span>
                          {lang.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    <span className="font-medium">{t('theme')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{t('light')}</span>
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={toggleTheme}
                    />
                    <span className="text-sm">{t('dark')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
