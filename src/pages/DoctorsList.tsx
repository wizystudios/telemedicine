
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Clock, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface Doctor {
  id: string;
  user_id: string;
  bio: string;
  specialty_id: string;
  experience_years: number;
  consultation_fee: number;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_available: boolean;
  languages: string[];
  education: string[];
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  specialties: {
    name: string;
    icon: string;
  };
}

export default function DoctorsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch specialties for filter
  const { data: specialties } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch doctors with filters
  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors', searchTerm, selectedSpecialty, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('doctor_profiles')
        .select(`
          *,
          profiles!inner(first_name, last_name, avatar_url),
          specialties(name, icon)
        `)
        .eq('is_verified', true);

      // Apply specialty filter
      if (selectedSpecialty !== 'all') {
        query = query.eq('specialty_id', selectedSpecialty);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`profiles.first_name.ilike.%${searchTerm}%,profiles.last_name.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'experience':
          query = query.order('experience_years', { ascending: false });
          break;
        case 'fee':
          query = query.order('consultation_fee', { ascending: true });
          break;
        default:
          query = query.order('rating', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Doctor[];
    }
  });

  const handleBookAppointment = (doctorId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please login to book an appointment',
        variant: 'destructive'
      });
      return;
    }
    
    navigate(`/book-appointment/${doctorId}`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Find Your Doctor
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Connect with verified healthcare professionals
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search doctors by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Specialty Filter */}
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties?.map((specialty) => (
                  <SelectItem key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="experience">Most Experienced</SelectItem>
                <SelectItem value="fee">Lowest Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Doctors Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-300 rounded"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-300 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors?.map((doctor) => (
              <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
                        <span className="text-emerald-600 font-semibold text-lg">
                          {doctor.profiles?.first_name?.[0]}{doctor.profiles?.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {doctor.specialties?.name}
                        </Badge>
                        {doctor.is_verified && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-2">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${doctor.is_available ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                    {doctor.bio || 'Experienced healthcare professional dedicated to providing quality care.'}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      {renderStars(doctor.rating)}
                      <span className="ml-1 text-gray-600">
                        {doctor.rating.toFixed(1)} ({doctor.total_reviews})
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      {doctor.experience_years}y exp
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-emerald-600">
                      ${doctor.consultation_fee}
                    </div>
                    <Button 
                      onClick={() => handleBookAppointment(doctor.user_id)}
                      disabled={!doctor.is_available}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {doctor.is_available ? 'Book Now' : 'Unavailable'}
                    </Button>
                  </div>

                  {doctor.languages && doctor.languages.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doctor.languages.slice(0, 3).map((lang, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {doctors && doctors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No doctors found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Try adjusting your search filters or check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
