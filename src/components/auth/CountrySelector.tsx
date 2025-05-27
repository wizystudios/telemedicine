
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { Search } from 'lucide-react';

interface Country {
  name: string;
  code: string;
  phoneCode: string;
  flag: string;
}

const countries: Country[] = [
  { name: 'Afghanistan', code: 'AF', phoneCode: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', phoneCode: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', phoneCode: '+213', flag: '🇩🇿' },
  { name: 'Argentina', code: 'AR', phoneCode: '+54', flag: '🇦🇷' },
  { name: 'Australia', code: 'AU', phoneCode: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', phoneCode: '+43', flag: '🇦🇹' },
  { name: 'Bangladesh', code: 'BD', phoneCode: '+880', flag: '🇧🇩' },
  { name: 'Belgium', code: 'BE', phoneCode: '+32', flag: '🇧🇪' },
  { name: 'Brazil', code: 'BR', phoneCode: '+55', flag: '🇧🇷' },
  { name: 'Canada', code: 'CA', phoneCode: '+1', flag: '🇨🇦' },
  { name: 'China', code: 'CN', phoneCode: '+86', flag: '🇨🇳' },
  { name: 'Denmark', code: 'DK', phoneCode: '+45', flag: '🇩🇰' },
  { name: 'Egypt', code: 'EG', phoneCode: '+20', flag: '🇪🇬' },
  { name: 'France', code: 'FR', phoneCode: '+33', flag: '🇫🇷' },
  { name: 'Germany', code: 'DE', phoneCode: '+49', flag: '🇩🇪' },
  { name: 'Ghana', code: 'GH', phoneCode: '+233', flag: '🇬🇭' },
  { name: 'India', code: 'IN', phoneCode: '+91', flag: '🇮🇳' },
  { name: 'Indonesia', code: 'ID', phoneCode: '+62', flag: '🇮🇩' },
  { name: 'Italy', code: 'IT', phoneCode: '+39', flag: '🇮🇹' },
  { name: 'Japan', code: 'JP', phoneCode: '+81', flag: '🇯🇵' },
  { name: 'Kenya', code: 'KE', phoneCode: '+254', flag: '🇰🇪' },
  { name: 'Malaysia', code: 'MY', phoneCode: '+60', flag: '🇲🇾' },
  { name: 'Mexico', code: 'MX', phoneCode: '+52', flag: '🇲🇽' },
  { name: 'Netherlands', code: 'NL', phoneCode: '+31', flag: '🇳🇱' },
  { name: 'Nigeria', code: 'NG', phoneCode: '+234', flag: '🇳🇬' },
  { name: 'Norway', code: 'NO', phoneCode: '+47', flag: '🇳🇴' },
  { name: 'Pakistan', code: 'PK', phoneCode: '+92', flag: '🇵🇰' },
  { name: 'Philippines', code: 'PH', phoneCode: '+63', flag: '🇵🇭' },
  { name: 'Russia', code: 'RU', phoneCode: '+7', flag: '🇷🇺' },
  { name: 'Saudi Arabia', code: 'SA', phoneCode: '+966', flag: '🇸🇦' },
  { name: 'South Africa', code: 'ZA', phoneCode: '+27', flag: '🇿🇦' },
  { name: 'South Korea', code: 'KR', phoneCode: '+82', flag: '🇰🇷' },
  { name: 'Spain', code: 'ES', phoneCode: '+34', flag: '🇪🇸' },
  { name: 'Sweden', code: 'SE', phoneCode: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', phoneCode: '+41', flag: '🇨🇭' },
  { name: 'Tanzania', code: 'TZ', phoneCode: '+255', flag: '🇹🇿' },
  { name: 'Thailand', code: 'TH', phoneCode: '+66', flag: '🇹🇭' },
  { name: 'Turkey', code: 'TR', phoneCode: '+90', flag: '🇹🇷' },
  { name: 'Uganda', code: 'UG', phoneCode: '+256', flag: '🇺🇬' },
  { name: 'United Kingdom', code: 'GB', phoneCode: '+44', flag: '🇬🇧' },
  { name: 'United States', code: 'US', phoneCode: '+1', flag: '🇺🇸' },
  { name: 'Vietnam', code: 'VN', phoneCode: '+84', flag: '🇻🇳' },
];

interface CountrySelectorProps {
  onSelect: (country: string, phoneCode: string) => void;
  selectedCountry?: string;
}

export function CountrySelector({ onSelect, selectedCountry }: CountrySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCountrySelect = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      onSelect(country.name, country.phoneCode);
    }
  };

  const selectedCountryData = countries.find(c => c.name === selectedCountry);

  return (
    <Select value={selectedCountryData?.code || ''} onValueChange={handleCountrySelect}>
      <SelectTrigger className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600">
        <SelectValue placeholder={t('selectCountry')}>
          {selectedCountryData && (
            <div className="flex items-center">
              <span className="mr-2 text-lg">{selectedCountryData.flag}</span>
              <span>{selectedCountryData.name}</span>
              <span className="ml-auto text-gray-500">{selectedCountryData.phoneCode}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-60">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('searchCountry')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {filteredCountries.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <div className="flex items-center w-full">
              <span className="mr-3 text-lg">{country.flag}</span>
              <span className="flex-1">{country.name}</span>
              <span className="text-gray-500 ml-2">{country.phoneCode}</span>
            </div>
          </SelectItem>
        ))}
        {filteredCountries.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            {t('noCountriesFound')}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
