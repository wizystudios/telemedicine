
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
    
    // Progressive Registration
    letsGetStarted: "Let's get started",
    tellUsYourName: 'Tell us your name',
    createUsername: 'Create username',
    usernameWillBeUsed: 'This will be used in your profile',
    contactInformation: 'Contact Information',
    howCanWeReachYou: 'How can we reach you?',
    secureYourAccount: 'Secure your account',
    createStrongPassword: 'Create a strong password',
    step: 'Step',
    of: 'of',
    
    // Form validation
    firstNameRequired: 'First name is required',
    lastNameRequired: 'Last name is required',
    usernameRequired: 'Username is required',
    usernameTooShort: 'Username must be at least 3 characters',
    usernameInvalid: 'Username can only contain letters, numbers, and underscores',
    usernameNotAvailable: 'Username is not available',
    usernameRequirements: 'Only letters, numbers, and underscores allowed',
    emailRequired: 'Email is required',
    emailInvalid: 'Please enter a valid email',
    countryRequired: 'Country is required',
    passwordRequired: 'Password is required',
    passwordRequirements: 'Password must meet all requirements',
    
    // Password requirements
    atLeast8Characters: 'At least 8 characters',
    oneUppercaseLetter: 'One uppercase letter',
    oneNumber: 'One number',
    oneSpecialCharacter: 'One special character',
    
    // General form
    username: 'Username',
    country: 'Country',
    optional: 'optional',
    required: 'required',
    enterFirstName: 'Enter your first name',
    enterLastName: 'Enter your last name',
    enterUsername: 'Enter username',
    enterEmail: 'Enter your email',
    enterPassword: 'Enter your password',
    selectCountry: 'Select your country',
    searchCountry: 'Search countries...',
    noCountriesFound: 'No countries found',
    
    // Messages
    registrationSuccess: 'Registration successful!',
    registrationFailed: 'Registration failed',
    checkEmailVerification: 'Please check your email to verify your account',
    somethingWentWrong: 'Something went wrong. Please try again.',
    
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
    
    // Progressive Registration
    letsGetStarted: 'Hebu tuanze',
    tellUsYourName: 'Tuambie jina lako',
    createUsername: 'Tengeneza jina la mtumiaji',
    usernameWillBeUsed: 'Hili litatumika katika wasifu wako',
    contactInformation: 'Maelezo ya Mawasiliano',
    howCanWeReachYou: 'Tunawezaje kukufikia?',
    secureYourAccount: 'Linda akaunti yako',
    createStrongPassword: 'Tengeneza nywila kali',
    step: 'Hatua',
    of: 'ya',
    
    // Form validation
    firstNameRequired: 'Jina la kwanza linahitajika',
    lastNameRequired: 'Jina la mwisho linahitajika',
    usernameRequired: 'Jina la mtumiaji linahitajika',
    usernameTooShort: 'Jina la mtumiaji lazima liwe na angalau herufi 3',
    usernameInvalid: 'Jina la mtumiaji linaweza kuwa na herufi, nambari, na mistari tu',
    usernameNotAvailable: 'Jina la mtumiaji halipo',
    usernameRequirements: 'Herufi, nambari, na mistari tu vinaruhusiwa',
    emailRequired: 'Barua pepe inahitajika',
    emailInvalid: 'Tafadhali ingiza barua pepe halali',
    countryRequired: 'Nchi inahitajika',
    passwordRequired: 'Nywila inahitajika',
    passwordRequirements: 'Nywila lazima ikidhi mahitaji yote',
    
    // Password requirements
    atLeast8Characters: 'Angalau herufi 8',
    oneUppercaseLetter: 'Herufi moja kubwa',
    oneNumber: 'Nambari moja',
    oneSpecialCharacter: 'Herufi moja maalum',
    
    // General form
    username: 'Jina la Mtumiaji',
    country: 'Nchi',
    optional: 'si lazima',
    required: 'lazima',
    enterFirstName: 'Ingiza jina lako la kwanza',
    enterLastName: 'Ingiza jina lako la mwisho',
    enterUsername: 'Ingiza jina la mtumiaji',
    enterEmail: 'Ingiza barua pepe yako',
    enterPassword: 'Ingiza nywila yako',
    selectCountry: 'Chagua nchi yako',
    searchCountry: 'Tafuta nchi...',
    noCountriesFound: 'Hakuna nchi zilizopatikana',
    
    // Messages
    registrationSuccess: 'Usajili umefanikiwa!',
    registrationFailed: 'Usajili umeshindwa',
    checkEmailVerification: 'Tafadhali angalia barua pepe yako ili kuthibitisha akaunti yako',
    somethingWentWrong: 'Kitu kimekwenda vibaya. Tafadhali jaribu tena.',
    
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
