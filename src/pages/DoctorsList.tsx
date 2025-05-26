
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Clock, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DoctorsList() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpecialties();
    fetchDoctors();
  }, [searchTerm, selectedSpecialty]);

  const fetchSpecialties = async () => {
    const { data } = await supabase
      .from('specialties')
      .select('*')
      .order('name');
    setSpecialties(data || []);
  };

  const fetchDoctors = async () => {
    setLoading(true);
    let query = supabase
      .from('doctor_profiles')
      .select(`
        *,
        profile:profiles!doctor_profiles_user_id_fkey(first_name, last_name, avatar_url, email),
        specialty:specialties(name)
      `)
      .eq('is_verified', true);

    if (selectedSpecialty) {
      query = query.eq('specialty_id', selectedSpecialty);
    }

    const { data } = await query.order('rating', { ascending: false });
    
    let filteredDoctors = data || [];
    
    if (searchTerm) {
      filteredDoctors = filteredDoctors.filter(doctor => 
        doctor.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialty?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setDoctors(filteredDoctors);
    setLoading(false);
  };

  const handleBookAppointment = (doctorId: string) => {
    navigate(`/book-appointment/${doctorId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Find a Doctor</h1>
        <p className="text-gray-600">Browse our network of qualified healthcare professionals</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search doctors by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Specialties</SelectItem>
            {specialties.map(specialty => (
              <SelectItem key={specialty.id} value={specialty.id}>
                {specialty.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={doctor.profile?.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                      {doctor.profile?.first_name?.[0]}{doctor.profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      Dr. {doctor.profile?.first_name} {doctor.profile?.last_name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {doctor.specialty?.name}
                    </CardDescription>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{doctor.rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-sm text-gray-500">({doctor.total_reviews} reviews)</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{doctor.experience_years} years experience</span>
                  </div>
                  {doctor.languages && doctor.languages.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>{doctor.languages.join(', ')}</span>
                    </div>
                  )}
                </div>

                {doctor.bio && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {doctor.bio}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-lg font-bold text-blue-600">
                      ${doctor.consultation_fee}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">consultation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={doctor.is_available ? "default" : "secondary"}
                      className={doctor.is_available ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      {doctor.is_available ? "Available" : "Busy"}
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => handleBookAppointment(doctor.user_id)}
                      disabled={!doctor.is_available}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Book
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
