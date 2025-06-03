
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Heart, Settings, Globe, Moon, Sun } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LanguageSelector } from '@/components/auth/LanguageSelector';

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
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: user?.user_metadata?.first_name || '',
    last_name: user?.user_metadata?.last_name || '',
    phone: user?.user_metadata?.phone || '',
    country: user?.user_metadata?.country || '',
    avatar_url: user?.user_metadata?.avatar_url || ''
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: profileData
      });

      if (error) throw error;

      toast({
        title: t('profileUpdated'),
        description: t('profileUpdatedSuccess'),
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <User className="w-8 h-8 text-emerald-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('profile')}</h1>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <TabsTrigger value="personal" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:block">{t('personalInfo')}</span>
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex items-center space-x-2">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:block">{t('medicalInfo')}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:block">{t('settings')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>{t('personalInfo')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profileData.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {profileData.first_name?.[0]}{profileData.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Badge variant="secondary">
                    {user?.user_metadata?.role === 'doctor' ? t('doctor') : t('patient')}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">{t('firstName')}</Label>
                    <Input
                      id="first_name"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                      placeholder={t('enterFirstName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">{t('lastName')}</Label>
                    <Input
                      id="last_name"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                      placeholder={t('enterLastName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('phone')}</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+255 123 456 789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">{t('country')}</Label>
                    <Input
                      id="country"
                      value={profileData.country}
                      onChange={(e) => setProfileData({...profileData, country: e.target.value})}
                      placeholder={t('selectCountry')}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isLoading} className="w-full">
                  {isLoading ? t('saving') : t('saveChanges')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>{t('medicalInfo')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                  {t('medicalInfoComingSoon')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>{t('settings')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <div>
                      <p className="font-medium">{t('language')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {languages.find(l => l.code === language)?.name}
                      </p>
                    </div>
                  </div>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="mr-2">{lang.flag}</span>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {theme === 'dark' ? (
                      <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    ) : (
                      <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    )}
                    <div>
                      <p className="font-medium">{t('theme')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {theme === 'dark' ? t('dark') : t('light')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
