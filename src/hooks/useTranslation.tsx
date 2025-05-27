
import { useTheme } from '@/contexts/ThemeContext';

const translations = {
  en: {
    // App branding
    appName: 'TeleMed',
    poweredBy: 'Powered by KN Technology',
    
    // Loading
    loading: 'Loading...',
    initializing: 'Initializing TeleMed...',
    
    // Auth
    welcome: 'Welcome to TeleMed',
    subtitle: 'Healthcare at your fingertips',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    createAccount: 'Create Account',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone Number',
    password: 'Password',
    role: 'I am a',
    patient: 'Patient',
    doctor: 'Doctor',
    signingIn: 'Signing in...',
    creatingAccount: 'Creating account...',
    welcomeBack: 'Welcome back!',
    signedInSuccess: "You've been successfully signed in.",
    accountCreated: 'Account created!',
    checkEmail: 'Please check your email to verify your account.',
    
    // Navigation
    home: 'Home',
    appointments: 'Appointments',
    messages: 'Messages',
    doctors: 'Doctors',
    profile: 'Profile',
    
    // Settings
    settings: 'Settings',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    
    // Dashboard
    dashboard: 'Dashboard',
    findDoctors: 'Find Doctors',
    upcomingAppointments: 'Upcoming Appointments',
    recentActivity: 'Recent Activity',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    continue: 'Continue',
    next: 'Next',
    back: 'Back',
    done: 'Done',
  },
  sw: {
    // App branding
    appName: 'TeleMed',
    poweredBy: 'Imeundwa na KN Technology',
    
    // Loading
    loading: 'Inapakia...',
    initializing: 'Inaanzisha TeleMed...',
    
    // Auth
    welcome: 'Karibu TeleMed',
    subtitle: 'Huduma za afya mkononi mwako',
    signIn: 'Ingia',
    signUp: 'Jisajili',
    createAccount: 'Tengeneza Akaunti',
    firstName: 'Jina la Kwanza',
    lastName: 'Jina la Mwisho',
    email: 'Barua Pepe',
    phone: 'Nambari ya Simu',
    password: 'Nywila',
    role: 'Mimi ni',
    patient: 'Mgonjwa',
    doctor: 'Daktari',
    signingIn: 'Inaingia...',
    creatingAccount: 'Inaunda akaunti...',
    welcomeBack: 'Karibu tena!',
    signedInSuccess: 'Umeingia kikamilifu.',
    accountCreated: 'Akaunti imeundwa!',
    checkEmail: 'Tafadhali angalia barua pepe yako ili kuthibitisha akaunti yako.',
    
    // Navigation
    home: 'Nyumbani',
    appointments: 'Miadi',
    messages: 'Ujumbe',
    doctors: 'Madaktari',
    profile: 'Wasifu',
    
    // Settings
    settings: 'Mipangilio',
    language: 'Lugha',
    theme: 'Mandhari',
    light: 'Mwanga',
    dark: 'Giza',
    
    // Dashboard
    dashboard: 'Dashibodi',
    findDoctors: 'Tafuta Madaktari',
    upcomingAppointments: 'Miadi Ijayo',
    recentActivity: 'Shughuli za Hivi Karibuni',
    
    // Common
    save: 'Hifadhi',
    cancel: 'Ghairi',
    continue: 'Endelea',
    next: 'Ifuatayo',
    back: 'Rudi',
    done: 'Imemaliza',
  }
};

export function useTranslation() {
  const { language } = useTheme();
  
  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || translations.en[key] || key;
  };
  
  return { t };
}
