
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
import { Textarea } from '@/components/ui/textarea';
import { User, Heart, Settings, Globe, Moon, Sun, Stethoscope, GraduationCap, Building, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const countries = [
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
];

export default function Profile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { theme, language, toggleTheme, setLanguage } = useTheme();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const userRole = user?.user_metadata?.role || 'patient';

  const [profileData, setProfileData] = useState({
    first_name: user?.user_metadata?.first_name || '',
    last_name: user?.user_metadata?.last_name || '',
    phone: user?.user_metadata?.phone || '',
    country: user?.user_metadata?.country || '',
    avatar_url: user?.user_metadata?.avatar_url || '',
    // Doctor specific fields
    education: user?.user_metadata?.education || '',
    experience_years: user?.user_metadata?.experience_years || '',
    hospital: user?.user_metadata?.hospital || '',
    bio: user?.user_metadata?.bio || '',
    consultation_fee: user?.user_metadata?.consultation_fee || '',
    specialization: user?.user_metadata?.specialization || '',
    // Patient specific fields
    date_of_birth: user?.user_metadata?.date_of_birth || '',
    gender: user?.user_metadata?.gender || '',
    blood_type: user?.user_metadata?.blood_type || '',
    emergency_contact_name: user?.user_metadata?.emergency_contact_name || '',
    emergency_contact_phone: user?.user_metadata?.emergency_contact_phone || '',
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
            <TabsTrigger value="professional" className="flex items-center space-x-2">
              {userRole === 'doctor' ? <Stethoscope className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
              <span className="hidden sm:block">{userRole === 'doctor' ? 'Professional' : t('medicalInfo')}</span>
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
                  <Badge variant="secondary" className="capitalize">
                    {userRole === 'doctor' ? '🩺 Doctor' : '👤 Patient'}
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
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
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
                    <Label htmlFor="country">Country</Label>
                    <Select value={profileData.country} onValueChange={(value) => setProfileData({...profileData, country: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            <span className="mr-2">{country.flag}</span>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isLoading} className="w-full">
                  {isLoading ? t('saving') : t('saveChanges')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {userRole === 'doctor' ? <Stethoscope className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                  <span>{userRole === 'doctor' ? 'Professional Information' : t('medicalInfo')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {userRole === 'doctor' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          value={profileData.specialization}
                          onChange={(e) => setProfileData({...profileData, specialization: e.target.value})}
                          placeholder="e.g., Cardiology, Pediatrics"
                        />
                      </div>
                      <div>
                        <Label htmlFor="experience_years">Years of Experience</Label>
                        <Input
                          id="experience_years"
                          type="number"
                          value={profileData.experience_years}
                          onChange={(e) => setProfileData({...profileData, experience_years: e.target.value})}
                          placeholder="5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="education">Education</Label>
                        <Input
                          id="education"
                          value={profileData.education}
                          onChange={(e) => setProfileData({...profileData, education: e.target.value})}
                          placeholder="Medical School, Degree"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hospital">Hospital/Clinic</Label>
                        <Input
                          id="hospital"
                          value={profileData.hospital}
                          onChange={(e) => setProfileData({...profileData, hospital: e.target.value})}
                          placeholder="Hospital or Clinic Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="consultation_fee">Consultation Fee ($)</Label>
                        <Input
                          id="consultation_fee"
                          type="number"
                          value={profileData.consultation_fee}
                          onChange={(e) => setProfileData({...profileData, consultation_fee: e.target.value})}
                          placeholder="50"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bio">Biography</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        placeholder="Tell patients about your experience and approach to medicine..."
                        rows={4}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={profileData.date_of_birth}
                          onChange={(e) => setProfileData({...profileData, date_of_birth: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={profileData.gender} onValueChange={(value) => setProfileData({...profileData, gender: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="blood_type">Blood Type</Label>
                        <Select value={profileData.blood_type} onValueChange={(value) => setProfileData({...profileData, blood_type: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                        <Input
                          id="emergency_contact_name"
                          value={profileData.emergency_contact_name}
                          onChange={(e) => setProfileData({...profileData, emergency_contact_name: e.target.value})}
                          placeholder="Full Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                        <Input
                          id="emergency_contact_phone"
                          value={profileData.emergency_contact_phone}
                          onChange={(e) => setProfileData({...profileData, emergency_contact_phone: e.target.value})}
                          placeholder="+255 123 456 789"
                        />
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={handleSaveProfile} disabled={isLoading} className="w-full">
                  {isLoading ? t('saving') : t('saveChanges')}
                </Button>
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
