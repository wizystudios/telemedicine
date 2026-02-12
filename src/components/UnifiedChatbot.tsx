import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, Mic, MicOff, Bot, Stethoscope, Building, Pill, TestTube, MapPin, Star, 
  Calendar as CalendarIcon, Clock, Phone, MessageCircle, ArrowLeft,
  User, Mail, FileText, Globe, Video, PhoneCall, AlertTriangle, LogOut, Settings,
  Sun, Moon, Heart, Bookmark, Play, ChevronRight, ChevronDown,
  Ambulance, MoreVertical, Users, HeartPulse, Bell, Shield, Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { ReviewDialog } from '@/components/ReviewDialog';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  data?: {
    type: 'doctors' | 'hospitals' | 'pharmacies' | 'labs' | 'appointments' | 'timetable' | 'alternative-times' | 'content';
    items: any[];
    doctorId?: string;
  };
}

interface DoctorTimetable {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

export function UnifiedChatbot() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);
  const [userRole, setUserRole] = useState<string>('patient');

  // Drawer states
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [selectedLab, setSelectedLab] = useState<any>(null);
  const [doctorTimetable, setDoctorTimetable] = useState<DoctorTimetable[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  
  // Booking state
  const [bookingDoctor, setBookingDoctor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState('');
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  const [bookingService, setBookingService] = useState<any>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  
  // Doctor chat mode
  const [chatMode, setChatMode] = useState<'bot' | 'doctor'>('bot');
  const [chatDoctor, setChatDoctor] = useState<any>(null);
  const [chatAppointmentId, setChatAppointmentId] = useState<string | null>(null);
  const [doctorMessages, setDoctorMessages] = useState<any[]>([]);

  // Hospital doctors and services
  const [hospitalDoctors, setHospitalDoctors] = useState<any[]>([]);
  const [hospitalServices, setHospitalServices] = useState<any[]>([]);
  const [pharmacyMedicines, setPharmacyMedicines] = useState<any[]>([]);
  const [labServices, setLabServices] = useState<any[]>([]);
  
  // Notifications & Reviews
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [reviewAppointment, setReviewAppointment] = useState<any>(null);
  
  // Insurance
  const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState<string>('');
  const [hospitalInsurance, setHospitalInsurance] = useState<any[]>([]);
  const [pharmacyInsurance, setPharmacyInsurance] = useState<any[]>([]);
  const [labInsurance, setLabInsurance] = useState<any[]>([]);
  
  // Timetable dropdown
  const [timetableOpen, setTimetableOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, doctorMessages]);

  // Fetch user role
  useEffect(() => {
    async function fetchRole() {
      if (!user) return;
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      setUserRole(data?.role || 'patient');
    }
    fetchRole();
  }, [user]);

  // Fetch unread notifications count
  useEffect(() => {
    async function fetchUnread() {
      if (!user) return;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotifications(count || 0);
    }
    fetchUnread();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        setUnreadNotifications(prev => prev + 1);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch insurance providers
  useEffect(() => {
    async function fetchInsurance() {
      const { data } = await supabase.from('insurance_providers').select('*').eq('is_active', true);
      setInsuranceProviders(data || []);
    }
    fetchInsurance();
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.lang = 'sw-TZ';
      recognition.current.onresult = (event: any) => {
        setInput(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend = () => setIsListening(false);
    }
  }, []);

  // Subscribe to doctor messages in real-time
  useEffect(() => {
    if (!chatAppointmentId) return;
    
    const channel = supabase
      .channel(`chat-${chatAppointmentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `appointment_id=eq.${chatAppointmentId}`
      }, (payload) => {
        if (payload.new.sender_id !== user?.id) {
          setDoctorMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatAppointmentId, user?.id]);

  const toggleListening = () => {
    if (recognition.current) {
      if (isListening) recognition.current.stop();
      else recognition.current.start();
      setIsListening(!isListening);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: 'Umefanikiwa kutoka', description: 'Kwaheri!' });
  };

  // Fetch doctor's timetable
  const fetchDoctorTimetable = async (doctorId: string) => {
    const { data } = await supabase
      .from('doctor_timetable')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_available', true)
      .order('day_of_week');
    
    setDoctorTimetable(data || []);
    return data || [];
  };

  // Check booked times for a specific date - use correct status values
  const checkBookedTimes = async (doctorId: string, date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('appointments')
      .select('appointment_date')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', startOfDay.toISOString())
      .lte('appointment_date', endOfDay.toISOString())
      .in('status', ['scheduled', 'approved']); // Fixed: use correct status values

    const booked = data?.map(apt => format(new Date(apt.appointment_date), 'HH:mm')) || [];
    setBookedTimes(booked);
    return booked;
  };

  // Generate available time slots based on timetable
  const generateTimeSlots = (timetable: DoctorTimetable[], dayOfWeek: number, booked: string[]) => {
    const daySchedule = timetable.find(t => t.day_of_week === dayOfWeek);
    
    // If no timetable for this day, generate default slots (9 AM to 5 PM)
    if (!daySchedule) {
      const defaultSlots: string[] = [];
      for (let hour = 9; hour < 17; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        if (!booked.includes(time)) {
          defaultSlots.push(time);
        }
        const halfTime = `${hour.toString().padStart(2, '0')}:30`;
        if (!booked.includes(halfTime)) {
          defaultSlots.push(halfTime);
        }
      }
      return defaultSlots;
    }

    const slots: string[] = [];
    const [startHour] = daySchedule.start_time.split(':').map(Number);
    const [endHour] = daySchedule.end_time.split(':').map(Number);

    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      if (!booked.includes(time)) {
        slots.push(time);
      }
      const halfTime = `${hour.toString().padStart(2, '0')}:30`;
      if (!booked.includes(halfTime)) {
        slots.push(halfTime);
      }
    }

    return slots;
  };

  // Handle date selection for booking
  const handleDateSelect = async (date: Date | undefined) => {
    setBookingDate(date);
    if (!date || !bookingDoctor) return;

    const doctorId = bookingDoctor.user_id || bookingDoctor.profiles?.id;
    const dayOfWeek = date.getDay();
    
    let tt = doctorTimetable;
    if (tt.length === 0) {
      tt = await fetchDoctorTimetable(doctorId);
    }
    
    const booked = await checkBookedTimes(doctorId, date);
    const slots = generateTimeSlots(tt, dayOfWeek, booked);
    
    setAvailableTimes(slots);
    
    if (slots.length === 0) {
      toast({
        title: 'Hakuna nafasi',
        description: `Hakuna nafasi zilizobaki ${DAYS[dayOfWeek]}. Chagua siku nyingine.`,
        variant: 'destructive'
      });
    }
  };

  // Fetch hospital doctors
  const fetchHospitalDoctors = async (hospitalId: string) => {
    const { data } = await supabase
      .from('doctor_profiles')
      .select(`*, profiles!doctor_profiles_user_id_fkey(first_name, last_name, avatar_url, phone, email), specialties(name)`)
      .eq('hospital_id', hospitalId);
    setHospitalDoctors(data || []);
    return data || [];
  };

  // Fetch hospital services
  const fetchHospitalServices = async (hospitalId: string) => {
    const { data } = await supabase
      .from('hospital_services')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('is_available', true);
    setHospitalServices(data || []);
    return data || [];
  };

  // Fetch pharmacy medicines
  const fetchPharmacyMedicines = async (pharmacyId: string) => {
    const { data } = await supabase
      .from('pharmacy_medicines')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    setPharmacyMedicines(data || []);
  };

  // Fetch lab services
  const fetchLabServices = async (labId: string) => {
    const { data } = await supabase
      .from('laboratory_services')
      .select('*')
      .eq('laboratory_id', labId);
    setLabServices(data || []);
  };

  // Call ambulance
  const callAmbulance = (hospital: any) => {
    const ambulancePhone = hospital.ambulance_phone || hospital.phone;
    if (ambulancePhone) {
      window.location.href = `tel:${ambulancePhone}`;
      toast({ title: 'Inapigia simu...', description: `Ambulance: ${ambulancePhone}` });
    } else {
      toast({ title: 'Hakuna nambari', description: 'Hospitali haina nambari ya ambulance.', variant: 'destructive' });
    }
  };

  // Like content
  const likeContent = async (contentId: string) => {
    if (!user) return;
    const { error } = await supabase.from('content_likes').insert({ content_id: contentId, user_id: user.id });
    if (!error) {
      toast({ title: 'Imependwa!' });
    }
  };

  // Save content
  const saveContent = async (contentId: string) => {
    if (!user) return;
    const { error } = await supabase.from('saved_content').insert({ content_id: contentId, user_id: user.id });
    if (!error) {
      toast({ title: 'Imehifadhiwa!' });
    }
  };

  const processMessage = async (message: string): Promise<Message> => {
    const lower = message.toLowerCase();
    
    // Content/video search
    if (lower.includes('maudhui') || lower.includes('video') || lower.includes('tutorial') || lower.includes('elimu')) {
      const { data } = await supabase
        .from('institution_content')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Maudhui ${data.length} yanapatikana. Tazama na uhifadhi:` : 'Hakuna maudhui sasa.',
        timestamp: new Date(),
        data: data?.length ? { type: 'content', items: data } : undefined
      };
    }

    // Check for chat/wasiliana intent
    if (lower.includes('wasiliana') || lower.includes('ongea') || lower.includes('chat')) {
      const { data: doctors } = await supabase
        .from('doctor_profiles')
        .select(`*, profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url, phone, email), specialties(name)`)
        .eq('is_verified', true)
        .limit(10);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Chagua daktari unayetaka kuwasiliana naye:',
        timestamp: new Date(),
        data: doctors?.length ? { type: 'doctors', items: doctors } : undefined
      };
    }

    // Smart doctor search - check for specific name
    if (lower.includes('daktari') || lower.includes('doctor') || lower.includes('dr') || lower.includes('tafuta')) {
      // Extract potential name from query
      const words = lower.split(' ').filter(w => w.length > 2 && !['daktari', 'doctor', 'tafuta', 'nataka', 'nipatie'].includes(w));
      
      let query = supabase
        .from('doctor_profiles')
        .select(`*, profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url, phone, email), specialties(name)`)
        .eq('is_verified', true);
      
      // If there's a potential name, search for it
      if (words.length > 0) {
        const searchName = words.join(' ');
        const { data: matchedDoctors } = await supabase
          .from('doctor_profiles')
          .select(`*, profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url, phone, email), specialties(name)`)
          .eq('is_verified', true);
        
        // Filter by name match
        const filtered = matchedDoctors?.filter(d => {
          const fullName = `${d.profiles?.first_name || ''} ${d.profiles?.last_name || ''}`.toLowerCase();
          return words.some(w => fullName.includes(w));
        }) || [];
        
        if (filtered.length > 0) {
          if (filtered.length > 10) {
            return {
              id: Date.now().toString(),
              type: 'bot',
              content: `Karibu! Tumepata madaktari ${filtered.length} wenye jina hilo kutoka hospitali mbalimbali. Je, nikupe orodha yote au unataka daktari kutoka hospitali gani?`,
              timestamp: new Date(),
              suggestions: ['Ona wote', 'Hospitali ya Taifa', 'Hospitali nyingine'],
              data: { type: 'doctors', items: filtered.slice(0, 10) }
            };
          }
          return {
            id: Date.now().toString(),
            type: 'bot',
            content: `Tumepata madaktari ${filtered.length}. Bofya daktari kuona maelezo:`,
            timestamp: new Date(),
            data: { type: 'doctors', items: filtered }
          };
        }
      }
      
      const { data } = await query.limit(10);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Madaktari ${data.length} wanapatikana. Bofya daktari kuona maelezo:` : 'Hakuna daktari walioidhinishwa sasa.',
        timestamp: new Date(),
        data: data?.length ? { type: 'doctors', items: data } : undefined
      };
    }

    // Hospital search
    if (lower.includes('hospitali') || lower.includes('hospital')) {
      const { data } = await supabase.from('hospitals').select('*').eq('is_verified', true).limit(10);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Hospitali ${data.length}. Bofya kuona maelezo:` : 'Hakuna hospitali.',
        timestamp: new Date(),
        data: data?.length ? { type: 'hospitals', items: data } : undefined
      };
    }

    // Pharmacy search
    if (lower.includes('dawa') || lower.includes('famasi') || lower.includes('pharmacy')) {
      const { data } = await supabase.from('pharmacies').select('*').eq('is_verified', true).limit(10);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Maduka ya dawa ${data.length}. Bofya kuona:` : 'Hakuna maduka.',
        timestamp: new Date(),
        data: data?.length ? { type: 'pharmacies', items: data } : undefined
      };
    }

    // Lab search
    if (lower.includes('maabara') || lower.includes('lab') || lower.includes('test')) {
      const { data } = await supabase.from('laboratories').select('*').eq('is_verified', true).limit(10);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Maabara ${data.length}. Bofya kuona:` : 'Hakuna maabara.',
        timestamp: new Date(),
        data: data?.length ? { type: 'labs', items: data } : undefined
      };
    }

    // My appointments
    if (lower.includes('miadi') || lower.includes('appointment')) {
      const { data } = await supabase
        .from('appointments')
        .select('*, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)')
        .eq('patient_id', user?.id)
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(10);
      
      if (data?.length) {
        return {
          id: Date.now().toString(),
          type: 'bot',
          content: `Una miadi ${data.length}:`,
          timestamp: new Date(),
          data: { type: 'appointments', items: data }
        };
      }
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Huna miadi. Tafuta daktari kwanza ili kuweka miadi.',
        timestamp: new Date()
      };
    }

    // Health advice for common topics
    const healthTopics: Record<string, string> = {
      'tumbo': '🏥 **Maumivu ya Tumbo**\n\nUshauri wa kwanza:\n• Kunywa maji mengi ya uvuguvugu\n• Epuka vyakula vyenye mafuta mengi na viungo\n• Kula ndizi, wali, na mkate wa kawaida\n• Pumzika kwa kulala upande wa kushoto\n\n⚠️ Kama maumivu yanaendelea zaidi ya saa 24 au una homa, tafadhali muone daktari haraka.',
      'kichwa': '🧠 **Maumivu ya Kichwa**\n\nUshauri:\n• Kunywa maji ya kutosha (angalau glasi 8 kwa siku)\n• Pumzika mahali penye giza na utulivu\n• Weka kitambaa baridi kwenye paji la uso\n• Epuka mwanga mkali wa simu au kompyuta\n\n💊 Dawa za kawaida kama Paracetamol zinaweza kusaidia. Kama maumivu ni ya mara kwa mara, tafuta daktari.',
      'homa': '🌡️ **Homa na Mafua**\n\nUshauri:\n• Pumzika vizuri na lala saa 8+ kwa siku\n• Kunywa maji mengi, chai ya tangawizi na limau\n• Kula matunda yenye Vitamini C (machungwa, mapera)\n• Funika mdomo wakati wa kukohoa\n\n⚠️ Kama homa ni zaidi ya siku 3 au joto ni zaidi ya 38.5°C, muone daktari.',
      'lishe': '🥗 **Ushauri wa Lishe Bora**\n\n• Kula mboga za kijani kila siku (mchicha, sukumawiki)\n• Matunda angalau 2-3 kwa siku\n• Protini: maharagwe, samaki, mayai, nyama konda\n• Wanga: wali wa kahawia, viazi vitamu, ndizi za kupika\n• Epuka sukari nyingi na vyakula vilivyosindikwa\n• Kunywa maji glasi 8 kwa siku',
      'mazoezi': '💪 **Mazoezi na Fitness**\n\n• Tembea kwa kasi dakika 30 kila siku\n• Fanya mazoezi ya kunyoosha asubuhi\n• Mazoezi ya kupumua kwa kina hupunguza msongo\n• Ruka kamba au kimbia polepole mara 3 kwa wiki\n• Epuka kukaa saa nyingi - simama kila saa 1\n\n🎯 Anza polepole na ongeza taratibu. Afya ni safari, si mbio!',
      'usingizi': '😴 **Ushauri wa Usingizi Bora**\n\n• Lala na amka wakati uleule kila siku\n• Epuka kahawa baada ya saa 6 mchana\n• Zima simu dakika 30 kabla ya kulala\n• Chumba kiwe na baridi na giza\n• Kunywa chai ya chamomile kabla ya kulala\n\n💡 Usingizi wa saa 7-9 ni muhimu kwa afya ya mwili na akili.',
      'msongo': '🧘 **Kupunguza Msongo wa Mawazo**\n\n• Pumua kwa kina: inhale sekunde 4, shikilia 7, exhale 8\n• Tembea nje na uone maumbile\n• Ongea na mtu unayemwamini kuhusu hisia zako\n• Fanya kitu unachokipenda kila siku\n• Epuka habari za kusumbua kupita kiasi\n\n❤️ Afya ya akili ni sawa na afya ya mwili. Usisite kutafuta msaada.',
      'ngozi': '✨ **Utunzaji wa Ngozi**\n\n• Tumia mafuta ya kuzuia jua kila siku\n• Kunywa maji mengi kwa ngozi laini\n• Osha uso mara 2 kwa siku kwa sabuni laini\n• Kula vyakula vyenye Vitamini A na E\n• Lala vizuri - ngozi hujisanidi wakati wa usingizi',
      'jicho': '👁️ **Utunzaji wa Macho**\n\n• Pumzisha macho kila dakika 20 ukitumia simu/kompyuta\n• Kula karoti, mboga za kijani na samaki\n• Usisugue macho\n• Tumia taa ya kutosha wakati wa kusoma\n\n⚠️ Kama unaona ukungu au maumivu, muone daktari wa macho.',
      'mimba': '🤰 **Afya ya Uzazi na Ujauzito**\n\n• Nenda kliniki ya wajawazito mapema\n• Kula vyakula vyenye folic acid na chuma\n• Pumzika vizuri na epuka kazi nzito\n• Kunywa maji mengi\n• Fuata ushauri wa daktari wako\n\n💝 Kila hatua ya ujauzito ni muhimu. Usikose miadi yako ya kliniki.',
      'kisukari': '🩸 **Ugonjwa wa Kisukari (Diabetes)**\n\n• Punguza sukari na wanga katika chakula\n• Kula mboga nyingi na matunda yenye nyuzinyuzi\n• Fanya mazoezi mepesi kila siku (kutembea dakika 30)\n• Pima sukari yako mara kwa mara\n• Tumia dawa kama unavyoshauriwa na daktari\n\n⚠️ Kisukari kinaweza kudhibitiwa! Tembelea daktari mara kwa mara.',
      'malaria': '🦟 **Malaria - Kinga na Tiba**\n\n• Tumia chandarua chenye dawa kila usiku\n• Ondoa maji yaliyotuama karibu na nyumba\n• Dalili: homa kali, kutetemeka, jasho, maumivu ya kichwa\n• Pima damu ndani ya saa 24 ukiona dalili\n• Meza dawa ZOTE ulizoandikiwa na daktari\n\n🚨 Malaria ni hatari! Tembelea hospitali haraka ukiona dalili.',
      'shinikizo': '❤️ **Shinikizo la Damu (Blood Pressure)**\n\n• Punguza chumvi katika chakula chako\n• Epuka pombe na sigara\n• Fanya mazoezi ya kawaida\n• Lala vizuri na punguza msongo\n• Pima shinikizo angalau mara 1 kwa mwezi\n\n💊 Kama umepewa dawa, usizache hata ukijisikia vizuri!',
      'kikohozi': '🤧 **Kikohozi na Mafua**\n\n• Kunywa maji ya moto na asali na limau\n• Pumzika na ulale vizuri\n• Tumia mvuke wa maji ya moto (steam)\n• Epuka baridi na vumbi\n• Funika mdomo wakati wa kukohoa\n\n⚠️ Kikohozi cha zaidi ya wiki 2 kinaweza kuwa dalili ya TB. Muone daktari.',
      'kuharisha': '💧 **Kuharisha (Diarrhea)**\n\n• Kunywa ORS (chumvi na sukari) mara kwa mara\n• Kula vyakula vya laini: wali, ndizi, tosti\n• Epuka maziwa na vyakula vyenye mafuta\n• Osha mikono kwa sabuni\n\n🚨 Kama damu inaonekana au kuharisha kunazidi siku 3, tembelea hospitali.',
      'kutapika': '🤢 **Kutapika (Vomiting)**\n\n• Pumzika na usile kwa muda mfupi\n• Kunywa maji kidogo kidogo (sip sip)\n• Kula vyakula baridi na kavu (crackers, toast)\n• Epuka harufu kali za chakula\n\n⚠️ Kama unatapika damu au kutapika hakukomi kwa saa 12+, tembelea hospitali.',
      'moyo': '🫀 **Afya ya Moyo**\n\n• Kula samaki mara 2+ kwa wiki (omega-3)\n• Punguza mafuta ya wanyama na vyakula vya kukaanga\n• Fanya mazoezi dakika 30 kwa siku, siku 5 kwa wiki\n• Epuka sigara na pombe kupita kiasi\n• Pima shinikizo na cholesterol mara kwa mara\n\n❤️ Moyo wako unafanya kazi saa 24! Utunze vizuri.',
      'meno': '🦷 **Utunzaji wa Meno**\n\n• Piga mswaki mara 2 kwa siku (asubuhi na jioni)\n• Tumia uzi wa meno (floss) kila siku\n• Epuka sukari nyingi na vinywaji vya rangi\n• Tembelea daktari wa meno kila miezi 6\n\n⚠️ Maumivu ya meno yanaweza kuonyesha tatizo kubwa. Usipuuze!',
      'vitamini': '💊 **Vitamini Muhimu kwa Mwili**\n\n• **Vitamini A**: Karoti, viazi vitamu, mchicha → macho na ngozi\n• **Vitamini B**: Nafaka, mayai, nyama → nishati na ubongo\n• **Vitamini C**: Machungwa, mapera, pilipili → kinga ya mwili\n• **Vitamini D**: Jua la asubuhi dakika 15 → mifupa\n• **Chuma**: Mchicha, nyama, maharagwe → damu\n\n🍎 Lishe bora ni bora kuliko vidonge!',
      'stress': '🧘 **Kupunguza Msongo (Stress Management)**\n\n• Pumua kwa kina: inhale 4s, hold 7s, exhale 8s\n• Tembea nje angalau dakika 20\n• Andika mawazo yako kwenye daftari\n• Sikiliza muziki wa kutuliza\n• Ongea na rafiki au familia\n\n❤️ Kujitunza si ubinafsi - ni muhimu kwa afya yako!',
      'watoto': '👶 **Afya ya Watoto**\n\n• Chanjo zote kwa wakati (BCG, OPV, DPT, Measles)\n• Lishe: Maziwa ya mama pekee miezi 6 ya kwanza\n• Pima uzito na urefu kila mwezi\n• Kunywesha maji safi ya kuchemsha\n• Osha mikono ya mtoto mara kwa mara\n\n🏥 Tembelea kliniki ya watoto mara kwa mara.',
    };

    // Check if user is asking about a health topic
    for (const [keyword, advice] of Object.entries(healthTopics)) {
      if (lower.includes(keyword)) {
        return {
          id: Date.now().toString(),
          type: 'bot',
          content: advice + '\n\n---\n*Je, ungependa kutafuta daktari wa eneo hili? Andika "daktari" au "hospitali".*',
          timestamp: new Date(),
          suggestions: ['Tafuta daktari', 'Tafuta hospitali', 'Tafuta dawa']
        };
      }
    }

    // General health keywords
    const healthKeywords = ['maumivu', 'kuumwa', 'afya', 'diet', 'fitness', 'vitamini', 'ugonjwa', 
      'kupumua', 'moyo', 'shinikizo', 'kisukari', 'malaria', 'kikohozi', 'kuharisha', 'kutapika',
      'stomach', 'headache', 'pain', 'health', 'exercise', 'sleep', 'stress', 'skin', 'eye',
      'chanjo', 'pregnancy', 'uzazi', 'mwili', 'akili', 'depression', 'anxiety', 'corona', 'covid',
      'tb', 'kifua', 'ini', 'figo', 'cholesterol', 'anemia', 'upungufu', 'mkojo', 'kinyesi',
      'mzio', 'allergy', 'asthma', 'pumu', 'diabetes', 'cancer', 'saratani', 'hiv', 'ukimwi'];
    
    if (healthKeywords.some(k => lower.includes(k))) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `🩺 **Ushauri wa Afya**\n\nAsante kwa swali lako kuhusu "${message}". Hapa kuna ushauri wa jumla:\n\n• Kunywa maji mengi ya kutosha kila siku\n• Pata usingizi wa kutosha (saa 7-9)\n• Kula mboga na matunda ya kutosha\n• Fanya mazoezi mepesi angalau dakika 30 kwa siku\n\n⚕️ Kwa ushauri wa kitaalamu zaidi, napendekeza umuone daktari. Andika "daktari" ili nitafute daktari anayepatikana karibu nawe.\n\n---\n*Kumbuka: Ushauri huu si mbadala wa kumuona daktari. Kama una dharura, piga simu ya dharura mara moja.*`,
        timestamp: new Date(),
        suggestions: ['Tafuta daktari', 'Tafuta hospitali', 'Ushauri zaidi']
      };
    }

    // Greetings
    if (['habari', 'mambo', 'hello', 'hi', 'hujambo', 'salama'].some(g => lower.includes(g))) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `👋 **Habari! Karibu TeleMed**\n\nNinaweza kukusaidia na:\n\n🔍 **Kutafuta** - Daktari, Hospitali, Dawa, Maabara\n📅 **Miadi** - Weka na simamia miadi zako\n💬 **Mazungumzo** - Ongea na daktari moja kwa moja\n🏥 **Ushauri** - Maswali ya afya na lishe\n\nAndika unachohitaji au tumia vitufe hapo chini! 👇`,
        timestamp: new Date(),
        suggestions: ['Tafuta daktari', 'Tafuta hospitali', 'Miadi zangu', 'Ushauri wa afya']
      };
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `🤖 **Ninakusaidia!**\n\nNaweza kukusaidia na mambo mengi:\n\n• 🏥 Tafuta **hospitali** au **daktari**\n• 💊 Tafuta **dawa** au **famasi**\n• 🔬 Tafuta **maabara** ya vipimo\n• 📅 Angalia **miadi** zako\n• 🩺 Pata **ushauri wa afya** (lishe, mazoezi, usingizi)\n• 💬 **Ongea** na daktari\n\nAndika tu unachohitaji! 😊`,
      timestamp: new Date(),
      suggestions: ['Tafuta daktari', 'Hospitali', 'Ushauri wa lishe', 'Mazoezi']
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // If in doctor chat mode, send to doctor
    if (chatMode === 'doctor') {
      await sendDoctorMessage();
      return;
    }

    if (!hasStartedChat) setHasStartedChat(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await processMessage(input);
      setMessages(prev => [...prev, response]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => {
      if (!hasStartedChat) setHasStartedChat(true);
      const userMsg: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: action,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);
      processMessage(action).then(response => {
        setMessages(prev => [...prev, response]);
        setIsLoading(false);
      });
    }, 100);
  };

  const handleBookAppointment = async () => {
    if (!user) {
      toast({ title: 'Ingia kwanza', description: 'Unahitaji kuingia ili kuweka miadi.', variant: 'destructive' });
      return;
    }
    if (!bookingDoctor || !bookingDate || !bookingTime) {
      toast({ title: 'Jaza taarifa zote', description: 'Chagua tarehe na saa.', variant: 'destructive' });
      return;
    }

    const doctorId = bookingDoctor.user_id || bookingDoctor.profiles?.id;
    const appointmentDate = new Date(bookingDate);
    const [hours, minutes] = bookingTime.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Double-check for conflicts - use correct status values
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', appointmentDate.toISOString())
      .in('status', ['scheduled', 'approved']); // Fixed: use correct status values

    if (conflicts && conflicts.length > 0) {
      const booked = await checkBookedTimes(doctorId, bookingDate);
      const dayOfWeek = bookingDate.getDay();
      const alternatives = generateTimeSlots(doctorTimetable, dayOfWeek, booked).slice(0, 3);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content: `⚠️ Saa ${bookingTime} tayari imechukuliwa. Chagua wakati mwingine:`,
        timestamp: new Date(),
        data: { type: 'alternative-times', items: alternatives.map(t => ({ time: t })), doctorId }
      }]);
      
      toast({ title: 'Wakati umechukuliwa', description: 'Chagua wakati mwingine.', variant: 'destructive' });
      return;
    }

    // Create appointment with 'scheduled' status (correct value)
    const { error } = await supabase.from('appointments').insert({
      patient_id: user.id,
      doctor_id: doctorId,
      appointment_date: appointmentDate.toISOString(),
      symptoms: bookingSymptoms,
      status: 'scheduled', // Fixed: use correct status value
      consultation_type: 'video'
    });

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
      return;
    }

    // Create notification for doctor
    await supabase.from('notifications').insert({
      user_id: doctorId,
      title: 'Ombi la Miadi',
      message: `Mgonjwa ${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''} anaomba miadi tarehe ${format(appointmentDate, 'dd/MM/yyyy')} saa ${bookingTime}`,
      type: 'appointment_request'
    });

    toast({ title: 'Ombi limetumwa!', description: 'Daktari atakubali au kukataa ombi lako.' });
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'bot',
      content: `✅ Ombi la miadi limetumwa kwa Dr. ${bookingDoctor.profiles?.first_name} ${bookingDoctor.profiles?.last_name}.\n📅 Tarehe: ${format(appointmentDate, 'dd/MM/yyyy')}\n🕐 Saa: ${bookingTime}\n\nUtapata arifa daktari akikubali au kukataa.`,
      timestamp: new Date()
    }]);

    setBookingDoctor(null);
    setBookingDate(undefined);
    setBookingTime('');
    setBookingSymptoms('');
    setSelectedDoctor(null);
  };

  const openDoctorDetail = async (doctor: any) => {
    setSelectedDoctor(doctor);
    await fetchDoctorTimetable(doctor.user_id || doctor.profiles?.id);
  };

  const openHospitalDetail = async (hospital: any) => {
    setSelectedHospital(hospital);
    await Promise.all([
      fetchHospitalDoctors(hospital.id),
      fetchHospitalServices(hospital.id)
    ]);
  };

  const openPharmacyDetail = async (pharmacy: any) => {
    setSelectedPharmacy(pharmacy);
    await fetchPharmacyMedicines(pharmacy.id);
  };

  const openLabDetail = async (lab: any) => {
    setSelectedLab(lab);
    await fetchLabServices(lab.id);
  };

  const startBooking = (doctor: any) => {
    setBookingDoctor(doctor);
    setSelectedDoctor(null);
  };

  const startDoctorChat = async (doctor: any) => {
    if (!user) {
      toast({ title: 'Ingia kwanza', variant: 'destructive' });
      return;
    }

    const doctorId = doctor.user_id || doctor.profiles?.id;

    // Find existing appointment or create one for chat
    let { data: existingAppt } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', user.id)
      .eq('doctor_id', doctorId)
      .in('status', ['scheduled', 'approved']) // Fixed: use correct status values
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let apptId = existingAppt?.id;

    if (!apptId) {
      const { data: newAppt, error } = await supabase.from('appointments').insert({
        patient_id: user.id,
        doctor_id: doctorId,
        appointment_date: new Date().toISOString(),
        status: 'scheduled', // Fixed: use correct status value
        consultation_type: 'chat'
      }).select().single();

      if (error) {
        toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
        return;
      }
      apptId = newAppt?.id;
    }

    // Fetch existing messages
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('appointment_id', apptId)
      .order('created_at', { ascending: true });

    setDoctorMessages(msgs || []);
    setChatDoctor(doctor);
    setChatAppointmentId(apptId || null);
    setChatMode('doctor');
    setSelectedDoctor(null);
  };

  const sendDoctorMessage = async () => {
    if (!input.trim() || !chatAppointmentId || !user) return;

    const { error } = await supabase.from('chat_messages').insert({
      appointment_id: chatAppointmentId,
      sender_id: user.id,
      message: input,
      message_type: 'text'
    });

    if (!error) {
      setDoctorMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_id: user.id,
        message: input,
        created_at: new Date().toISOString()
      }]);
    }

    setInput('');
  };

  const exitDoctorChat = () => {
    setChatMode('bot');
    setChatDoctor(null);
    setChatAppointmentId(null);
    setDoctorMessages([]);
  };

  // Render doctor card
  const renderDoctorCard = (doc: any) => (
    <Card 
      key={doc.id} 
      className="cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/80"
      onClick={() => openDoctorDetail(doc)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={doc.profiles?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Dr. {doc.profiles?.first_name} {doc.profiles?.last_name}</p>
          <p className="text-xs text-muted-foreground">{doc.specialties?.name || doc.hospital_name || 'Daktari Mkuu'}</p>
          <div className="flex items-center gap-2 mt-1">
            {doc.rating > 0 && (
              <span className="text-xs flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {doc.rating.toFixed(1)}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {doc.consultation_fee ? `Tsh ${Number(doc.consultation_fee).toLocaleString()}` : 'Bure'}
            </Badge>
            {doc.is_available && <Badge className="text-[10px] bg-green-500">Online</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render hospital card
  const renderHospitalCard = (h: any) => (
    <Card 
      key={h.id} 
      className="cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/80"
      onClick={() => openHospitalDetail(h)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {h.logo_url ? (
          <Avatar className="h-12 w-12">
            <AvatarImage src={h.logo_url} />
            <AvatarFallback><Building className="h-6 w-6" /></AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{h.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{h.address}
          </p>
          {h.rating > 0 && (
            <span className="text-xs flex items-center gap-0.5 mt-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {h.rating.toFixed(1)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render pharmacy card
  const renderPharmacyCard = (p: any) => (
    <Card 
      key={p.id} 
      className="cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/80"
      onClick={() => openPharmacyDetail(p)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {p.logo_url ? (
          <Avatar className="h-12 w-12">
            <AvatarImage src={p.logo_url} />
            <AvatarFallback><Pill className="h-6 w-6" /></AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Pill className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{p.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{p.address}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Render lab card
  const renderLabCard = (l: any) => (
    <Card 
      key={l.id} 
      className="cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/80"
      onClick={() => openLabDetail(l)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {l.logo_url ? (
          <Avatar className="h-12 w-12">
            <AvatarImage src={l.logo_url} />
            <AvatarFallback><TestTube className="h-6 w-6" /></AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <TestTube className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{l.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{l.address}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Render data based on type
  const renderData = (data?: Message['data']) => {
    if (!data) return null;
    
    if (data.type === 'doctors') {
      return (
        <div className="space-y-2 mt-2">
          {data.items.map(renderDoctorCard)}
        </div>
      );
    }
    
    if (data.type === 'hospitals') {
      return (
        <div className="space-y-2 mt-2">
          {data.items.map(renderHospitalCard)}
        </div>
      );
    }
    
    if (data.type === 'pharmacies') {
      return (
        <div className="space-y-2 mt-2">
          {data.items.map(renderPharmacyCard)}
        </div>
      );
    }
    
    if (data.type === 'labs') {
      return (
        <div className="space-y-2 mt-2">
          {data.items.map(renderLabCard)}
        </div>
      );
    }
    
    if (data.type === 'appointments') {
      return (
        <div className="space-y-2 mt-2">
          {data.items.map((apt: any) => (
            <Card key={apt.id} className="border-border/50 bg-card/80">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={apt.doctor?.avatar_url} />
                    <AvatarFallback><Stethoscope className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}</p>
                    <p className="text-xs text-muted-foreground">
                      📅 {format(new Date(apt.appointment_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <Badge variant={apt.status === 'approved' ? 'default' : 'secondary'}>
                    {apt.status === 'scheduled' ? 'Inasubiri' : apt.status === 'approved' ? 'Imekubaliwa' : apt.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (data.type === 'content') {
      return (
        <div className="space-y-2 mt-2">
          {data.items.map((content: any) => (
            <Card key={content.id} className="border-border/50 bg-card/80">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    {content.content_type === 'video' ? <Play className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{content.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{content.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => likeContent(content.id)}>
                        <Heart className="h-3 w-3 mr-1" />
                        {content.likes_count || 0}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => saveContent(content.id)}>
                        <Bookmark className="h-3 w-3 mr-1" />
                        Hifadhi
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    return null;
  };

  // Doctor chat mode UI
  if (chatMode === 'doctor' && chatDoctor) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex items-center gap-3 p-4 border-b bg-card/50">
          <Button variant="ghost" size="icon" onClick={exitDoctorChat}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={chatDoctor.profiles?.avatar_url} />
            <AvatarFallback><Stethoscope className="h-5 w-5" /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">Dr. {chatDoctor.profiles?.first_name} {chatDoctor.profiles?.last_name}</p>
            <p className="text-xs text-muted-foreground">{chatDoctor.specialties?.name || 'Daktari'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => toast({ title: 'Simu', description: 'Huduma ya simu inakuja...' })}>
              <PhoneCall className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => toast({ title: 'Video', description: 'Huduma ya video inakuja...' })}>
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {doctorMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.sender_id === user?.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-card/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Andika ujumbe..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main chatbot UI
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Logo centered, Notifications and Settings on right */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50">
        <div className="w-20" />
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">TeleMed</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotifications(true)}>
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] flex items-center justify-center text-white font-medium">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowProfile(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area or Welcome Screen */}
      {!hasStartedChat ? (
        // Welcome screen - centered
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Habari{user?.user_metadata?.first_name ? ` ${user.user_metadata.first_name}` : ''}! 👋
            </h2>
            <p className="text-muted-foreground text-sm">
              Ninaweza kukusaidia kupata daktari, hospitali, maduka ya dawa, au maabara.
            </p>
          </div>

          {/* Input box with quick actions inside */}
          <div className="w-full max-w-md space-y-4">
            <div className="relative">
              <div className="flex gap-2">
                <Button
                  variant={isListening ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={toggleListening}
                  className="flex-shrink-0"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Andika swali lako..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 justify-center">
              {['Daktari', 'Hospitali', 'Dawa', 'Maabara', 'Maudhui'].map((action) => (
                <Button
                  key={action}
                  variant="secondary"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => handleQuickAction(action)}
                >
                  {action === 'Daktari' && '🩺'}
                  {action === 'Hospitali' && '🏥'}
                  {action === 'Dawa' && '💊'}
                  {action === 'Maabara' && '🔬'}
                  {action === 'Maudhui' && '🎬'}
                  {' '}{action}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Chat messages
        <>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.type === 'bot' ? 'flex gap-2' : ''}`}>
                    {msg.type === 'bot' && (
                      <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      {/* Bot text - plain without box, User text - with bubble */}
                      {msg.type === 'user' ? (
                        <div className="rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground">
                          <p className="text-sm whitespace-pre-line">{msg.content}</p>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-line py-1">{msg.content}</p>
                      )}
                      
                      {renderData(msg.data)}
                      
                      {msg.suggestions && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.suggestions.map((s, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs"
                              onClick={() => handleQuickAction(s.replace(/[^\w\s]/gi, ''))}
                            >
                              {s}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-2.5">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input at bottom */}
          <div className="p-4 border-t bg-card/50">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <Button
                  variant={isListening ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={toggleListening}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Andika ujumbe au bofya kitufe..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Profile Drawer */}
      <Drawer open={showProfile} onOpenChange={setShowProfile}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Mipangilio</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-6">
            {/* User info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-lg">{user?.email?.[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="outline" className="mt-1 capitalize">{userRole}</Badge>
              </div>
            </div>

            {/* Theme toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <p className="font-medium">Mwonekano</p>
                  <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Giza' : 'Mwanga'}</p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5" />
                <div>
                  <p className="font-medium">Lugha</p>
                  <p className="text-xs text-muted-foreground">Kiswahili</p>
                </div>
              </div>
            </div>

            {/* Role info */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5" />
                <div>
                  <p className="font-medium">Jukumu</p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                </div>
              </div>
            </div>

            {/* Add phone number (for existing email users) */}
            {user && !user.phone && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Phone className="h-5 w-5" />
                  <p className="font-medium">Ongeza Nambari ya Simu</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Ongeza nambari ya simu ili uweze kuingia kwa simu pia.
                </p>
                <Button variant="outline" size="sm" onClick={() => toast({ title: 'Inakuja', description: 'Huduma hii inakuja hivi karibuni.' })}>
                  Ongeza Simu
                </Button>
              </div>
            )}
          </div>
          <DrawerFooter>
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Toka
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Doctor Detail Drawer */}
      <Drawer open={!!selectedDoctor} onOpenChange={() => setSelectedDoctor(null)}>
        <DrawerContent className="max-h-[90vh]">
          <ScrollArea className="max-h-[80vh]">
            <DrawerHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={selectedDoctor?.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary/10">
                    <Stethoscope className="h-8 w-8 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DrawerTitle>Dr. {selectedDoctor?.profiles?.first_name} {selectedDoctor?.profiles?.last_name}</DrawerTitle>
                  <p className="text-sm text-muted-foreground">{selectedDoctor?.specialties?.name || 'Daktari Mkuu'}</p>
                  {selectedDoctor?.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm">{selectedDoctor.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({selectedDoctor.total_reviews} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            </DrawerHeader>
            
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                {selectedDoctor?.profiles?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {selectedDoctor.profiles.phone}
                  </div>
                )}
                {selectedDoctor?.profiles?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {selectedDoctor.profiles.email}
                  </div>
                )}
                {selectedDoctor?.hospital_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    {selectedDoctor.hospital_name}
                  </div>
                )}
                {selectedDoctor?.experience_years > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Uzoefu: Miaka {selectedDoctor.experience_years}
                  </div>
                )}
                {selectedDoctor?.consultation_fee && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Ada: Tsh {Number(selectedDoctor.consultation_fee).toLocaleString()}
                  </div>
                )}
              </div>

              {selectedDoctor?.bio && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Maelezo</h4>
                  <p className="text-sm text-muted-foreground">{selectedDoctor.bio}</p>
                </div>
              )}

              {doctorTimetable.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Ratiba</h4>
                  <div className="space-y-1">
                    {doctorTimetable.map((t, i) => (
                      <div key={i} className="flex justify-between text-sm bg-muted/50 px-3 py-1.5 rounded">
                        <span>{DAYS[t.day_of_week]}</span>
                        <span className="text-muted-foreground">{t.start_time} - {t.end_time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DrawerFooter>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => startBooking(selectedDoctor)}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Weka Miadi
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => startDoctorChat(selectedDoctor)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Wasiliana
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Booking Drawer */}
      <Drawer open={!!bookingDoctor} onOpenChange={() => setBookingDoctor(null)}>
        <DrawerContent className="max-h-[90vh]">
          <ScrollArea className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>Weka Miadi</DrawerTitle>
            </DrawerHeader>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={bookingDoctor?.profiles?.avatar_url} />
                  <AvatarFallback><Stethoscope className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Dr. {bookingDoctor?.profiles?.first_name} {bookingDoctor?.profiles?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{bookingDoctor?.specialties?.name || 'Daktari'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Chagua Tarehe</label>
                <Calendar
                  mode="single"
                  selected={bookingDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              {bookingDate && availableTimes.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Chagua Saa</label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant={bookingTime === time ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingTime(time)}
                        disabled={bookedTimes.includes(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {bookingDate && availableTimes.length === 0 && (
                <div className="text-center p-4 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                  <p className="text-sm text-destructive">Daktari hapatikani siku hii. Chagua siku nyingine.</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Dalili / Maelezo (hiari)</label>
                <Textarea
                  value={bookingSymptoms}
                  onChange={(e) => setBookingSymptoms(e.target.value)}
                  placeholder="Eleza dalili zako kwa ufupi..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
          <DrawerFooter>
            <Button 
              className="w-full" 
              onClick={handleBookAppointment}
              disabled={!bookingDate || !bookingTime}
            >
              Tuma Ombi la Miadi
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Hospital Detail Drawer */}
      <Drawer open={!!selectedHospital} onOpenChange={() => setSelectedHospital(null)}>
        <DrawerContent className="max-h-[90vh]">
          <ScrollArea className="max-h-[80vh]">
            <DrawerHeader>
              <div className="flex items-center gap-3">
                {selectedHospital?.logo_url ? (
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selectedHospital.logo_url} />
                    <AvatarFallback><Building className="h-7 w-7" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Building className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className="flex-1">
                  <DrawerTitle>{selectedHospital?.name}</DrawerTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedHospital?.address}
                  </div>
                </div>
              </div>
            </DrawerHeader>
            
            <div className="p-4 space-y-4">
              {(selectedHospital?.has_ambulance || selectedHospital?.ambulance_phone) && (
                <Button 
                  variant="destructive" 
                  className="w-full gap-2"
                  onClick={() => callAmbulance(selectedHospital)}
                >
                  <Ambulance className="h-5 w-5" />
                  Piga Simu Ambulance
                  {selectedHospital?.ambulance_available_24h && <Badge variant="secondary" className="ml-2 text-[10px]">24/7</Badge>}
                </Button>
              )}

              <div className="space-y-2">
                {selectedHospital?.phone && (
                  <a href={`tel:${selectedHospital.phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {selectedHospital.phone}
                  </a>
                )}
                {selectedHospital?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {selectedHospital.email}
                  </div>
                )}
                {selectedHospital?.website && (
                  <a href={selectedHospital.website} target="_blank" className="flex items-center gap-2 text-sm hover:text-primary">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {selectedHospital.website}
                  </a>
                )}
              </div>

              {selectedHospital?.description && (
                <p className="text-sm text-muted-foreground">{selectedHospital.description}</p>
              )}

              {hospitalServices.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Huduma ({hospitalServices.length})
                  </h4>
                  <div className="space-y-2">
                    {hospitalServices.map((service: any) => (
                      <Card key={service.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{service.name}</p>
                              {service.category && <Badge variant="outline" className="text-[10px]">{service.category}</Badge>}
                              {service.description && <p className="text-xs text-muted-foreground mt-1">{service.description}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {service.price && <p className="text-sm font-medium text-primary">Tsh {Number(service.price).toLocaleString()}</p>}
                              <Button 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hospitalDoctors.length > 0) {
                                    setBookingService(service);
                                    setShowAllDoctors(true);
                                  } else {
                                    toast({ title: 'Hakuna daktari', description: 'Chagua daktari kwanza.', variant: 'destructive' });
                                  }
                                }}
                              >
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                Weka Miadi
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedHospital?.services?.length > 0 && hospitalServices.length === 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Huduma</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedHospital.services.map((s: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {hospitalDoctors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Madaktari ({hospitalDoctors.length})
                    </h4>
                    {hospitalDoctors.length > 3 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => setShowAllDoctors(true)}
                      >
                        Ona wote
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {hospitalDoctors.slice(0, 3).map((doc) => (
                      <Card key={doc.id} className="border-border/50">
                        <CardContent className="p-2 flex items-center gap-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={doc.profiles?.avatar_url} />
                            <AvatarFallback><Stethoscope className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Dr. {doc.profiles?.first_name} {doc.profiles?.last_name}</p>
                            <p className="text-xs text-muted-foreground">{doc.specialties?.name || 'Daktari'}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedHospital(null); openDoctorDetail(doc); }}>
                                <User className="h-4 w-4 mr-2" />
                                Tazama Wasifu
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedHospital(null); startBooking(doc); }}>
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                Weka Miadi
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedHospital(null); startDoctorChat(doc); }}>
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Wasiliana
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* All Doctors Full-Page Drawer */}
      <Drawer open={showAllDoctors} onOpenChange={setShowAllDoctors}>
        <DrawerContent className="h-[95vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setShowAllDoctors(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <DrawerTitle>
                  {bookingService ? `Chagua Daktari - ${bookingService.name}` : 'Madaktari Wote'}
                </DrawerTitle>
                <p className="text-sm text-muted-foreground">{hospitalDoctors.length} madaktari wanapatikana</p>
              </div>
            </div>
          </DrawerHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {hospitalDoctors.map((doc) => (
                <Card key={doc.id} className="border-border/50 bg-card/80">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-14 w-14 border-2 border-primary/20">
                        <AvatarImage src={doc.profiles?.avatar_url} />
                        <AvatarFallback className="bg-primary/10">
                          <Stethoscope className="h-6 w-6 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">Dr. {doc.profiles?.first_name} {doc.profiles?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{doc.specialties?.name || 'Daktari Mkuu'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {doc.rating > 0 && (
                            <span className="text-xs flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {doc.rating.toFixed(1)}
                            </span>
                          )}
                          {doc.experience_years > 0 && (
                            <span className="text-xs text-muted-foreground">Miaka {doc.experience_years}</span>
                          )}
                          {doc.consultation_fee && (
                            <Badge variant="secondary" className="text-[10px]">
                              Tsh {Number(doc.consultation_fee).toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { 
                          setShowAllDoctors(false);
                          setSelectedHospital(null);
                          openDoctorDetail(doc); 
                        }}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Wasifu
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { 
                          setShowAllDoctors(false);
                          setSelectedHospital(null);
                          setBookingService(null);
                          startBooking(doc); 
                        }}
                      >
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Miadi
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { 
                          setShowAllDoctors(false);
                          setSelectedHospital(null);
                          startDoctorChat(doc); 
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Pharmacy Detail Drawer */}
      <Drawer open={!!selectedPharmacy} onOpenChange={() => setSelectedPharmacy(null)}>
        <DrawerContent className="max-h-[90vh]">
          <ScrollArea className="max-h-[80vh]">
            <DrawerHeader>
              <div className="flex items-center gap-3">
                {selectedPharmacy?.logo_url ? (
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selectedPharmacy.logo_url} />
                    <AvatarFallback><Pill className="h-7 w-7" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Pill className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                )}
                <div>
                  <DrawerTitle>{selectedPharmacy?.name}</DrawerTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedPharmacy?.address}
                  </div>
                </div>
              </div>
            </DrawerHeader>
            
            <div className="p-4 space-y-4">
              {selectedPharmacy?.quote_of_day && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm italic text-primary">"{selectedPharmacy.quote_of_day}"</p>
                </div>
              )}
              {selectedPharmacy?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {selectedPharmacy.phone}
                </div>
              )}
              {selectedPharmacy?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selectedPharmacy.email}
                </div>
              )}
              {selectedPharmacy?.fax && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Fax: {selectedPharmacy.fax}
                </div>
              )}
              {selectedPharmacy?.po_box && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  P.O. Box: {selectedPharmacy.po_box}
                </div>
              )}
              {selectedPharmacy?.description && (
                <p className="text-sm text-muted-foreground">{selectedPharmacy.description}</p>
              )}
              {selectedPharmacy?.emergency_available && (
                <Badge className="bg-red-500">Huduma za Dharura 24/7</Badge>
              )}

              {pharmacyMedicines.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Dawa ({pharmacyMedicines.length})</h4>
                  <div className="space-y-2">
                    {pharmacyMedicines.map((med) => (
                      <Card key={med.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{med.name}</p>
                              {med.category && <Badge variant="outline" className="text-[10px]">{med.category}</Badge>}
                            </div>
                            {med.price && <p className="text-sm font-medium text-primary">Tsh {med.price.toLocaleString()}</p>}
                          </div>
                          {med.description && <p className="text-xs text-muted-foreground mt-1">{med.description}</p>}
                          {med.usage_instructions && (
                            <p className="text-xs mt-1"><span className="font-medium">Matumizi:</span> {med.usage_instructions}</p>
                          )}
                          {med.target_audience && (
                            <p className="text-xs"><span className="font-medium">Kwa:</span> {med.target_audience}</p>
                          )}
                          {med.requires_prescription && (
                            <Badge variant="destructive" className="text-[10px] mt-1">Inahitaji Cheti</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Lab Detail Drawer */}
      <Drawer open={!!selectedLab} onOpenChange={() => setSelectedLab(null)}>
        <DrawerContent className="max-h-[90vh]">
          <ScrollArea className="max-h-[80vh]">
            <DrawerHeader>
              <div className="flex items-center gap-3">
                {selectedLab?.logo_url ? (
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selectedLab.logo_url} />
                    <AvatarFallback><TestTube className="h-7 w-7" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <TestTube className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                  </div>
                )}
                <div>
                  <DrawerTitle>{selectedLab?.name}</DrawerTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedLab?.address}
                  </div>
                </div>
              </div>
            </DrawerHeader>
            
            <div className="p-4 space-y-4">
              {selectedLab?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {selectedLab.phone}
                </div>
              )}
              {selectedLab?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selectedLab.email}
                </div>
              )}
              {selectedLab?.fax && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Fax: {selectedLab.fax}
                </div>
              )}
              {selectedLab?.po_box && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  P.O. Box: {selectedLab.po_box}
                </div>
              )}
              {selectedLab?.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {selectedLab.website}
                </div>
              )}
              {selectedLab?.description && (
                <p className="text-sm text-muted-foreground">{selectedLab.description}</p>
              )}
              {selectedLab?.emergency_available && (
                <Badge className="bg-red-500">Huduma za Dharura 24/7</Badge>
              )}

              {labServices.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Vipimo ({labServices.length})</h4>
                  <div className="space-y-2">
                    {labServices.map((service) => (
                      <Card key={service.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{service.name}</p>
                              {service.category && <Badge variant="outline" className="text-[10px]">{service.category}</Badge>}
                            </div>
                            {service.price && <p className="text-sm font-medium text-primary">Tsh {service.price.toLocaleString()}</p>}
                          </div>
                          {service.description && <p className="text-xs text-muted-foreground mt-1">{service.description}</p>}
                          {service.waiting_hours && (
                            <p className="text-xs mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Matokeo: Masaa {service.waiting_hours}
                            </p>
                          )}
                          {service.preparation_required && (
                            <p className="text-xs"><span className="font-medium">Maandalizi:</span> {service.preparation_required}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Notifications Drawer */}
      <NotificationsDrawer open={showNotifications} onOpenChange={setShowNotifications} />

      {/* Review Dialog */}
      {reviewAppointment && (
        <ReviewDialog 
          open={showReview} 
          onOpenChange={setShowReview}
          appointmentId={reviewAppointment.id}
          doctorId={reviewAppointment.doctor_id}
          doctorName={reviewAppointment.doctorName || ''}
        />
      )}
    </div>
  );
}