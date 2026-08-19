export const universities = [
  { id: 'uct', name: 'University of Cape Town', short: 'UCT', city: 'Cape Town' },
  { id: 'wits', name: 'University of the Witwatersrand', short: 'Wits', city: 'Johannesburg' },
  { id: 'up', name: 'University of Pretoria', short: 'UP', city: 'Pretoria' },
  { id: 'stellenbosch', name: 'Stellenbosch University', short: 'SU', city: 'Stellenbosch' },
  { id: 'ukzn', name: 'University of KwaZulu-Natal', short: 'UKZN', city: 'Durban' },
  { id: 'univen', name: 'University of Venda', short: 'UNIVEN', city: 'Thohoyandou' },
  { id: 'uj', name: 'University of Johannesburg', short: 'UJ', city: 'Johannesburg' },
  { id: 'nmu', name: 'Nelson Mandela University', short: 'NMU', city: 'Gqeberha' },
];

export type Property = {
  id: string;
  name: string;
  type: string;
  university: string;
  city: string;
  address: string;
  distance: number;
  price: number;
  rating: number;
  reviews: number;
  available: number;
  verified: boolean;
  description: string;
  images: string[];
  amenities: string[];
  rooms: Room[];
  manager: Manager;
  rules: string[];
  tags: string[];
};

export type Room = {
  id: string;
  type: string;
  capacity: number;
  price: number;
  available: number;
  bathroom: string;
  furnished: boolean;
};

export type Manager = {
  name: string;
  responseTime: string;
  verified: boolean;
};

export const properties: Property[] = [
  {
    id: 'p1',
    name: 'Campus View Residence',
    type: 'Residence',
    university: 'univen',
    city: 'Thohoyandou',
    address: '12 University Road, Thohoyandou',
    distance: 0.8,
    price: 3500,
    rating: 4.8,
    reviews: 124,
    available: 12,
    verified: true,
    description:
      'Campus View Residence offers modern, fully furnished student accommodation within walking distance of UNIVEN. Our secure complex features 24/7 security, high-speed Wi-Fi, and dedicated study rooms to help students thrive academically and socially.',
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop&auto=format',
    ],
    amenities: ['Wi-Fi', 'Electricity', 'Water', 'Security', 'Parking', 'Laundry', 'Study Area', 'Kitchen'],
    rooms: [
      { id: 'r1', type: 'Private', capacity: 1, price: 3500, available: 4, bathroom: 'En-suite', furnished: true },
      { id: 'r2', type: 'Shared', capacity: 2, price: 2200, available: 6, bathroom: 'Shared', furnished: true },
      { id: 'r3', type: 'Studio', capacity: 1, price: 4800, available: 2, bathroom: 'En-suite', furnished: true },
    ],
    manager: { name: 'Thabo Mkhize', responseTime: '< 1 hour', verified: true },
    rules: [
      'No smoking on premises',
      'Quiet hours 22:00–06:00',
      'No overnight guests without registration',
      'Keep common areas clean',
    ],
    tags: ['Near Campus', 'Wi-Fi', 'Furnished', 'Security'],
  },
  {
    id: 'p2',
    name: 'Varsity Heights',
    type: 'Student Complex',
    university: 'wits',
    city: 'Johannesburg',
    address: '45 Jan Smuts Ave, Braamfontein',
    distance: 1.2,
    price: 5200,
    rating: 4.6,
    reviews: 89,
    available: 8,
    verified: true,
    description:
      'Varsity Heights is a premium student complex in the heart of Braamfontein, steps from Wits University. Modern apartments with full kitchen facilities, gym access, and a rooftop study lounge.',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=500&fit=crop&auto=format',
    ],
    amenities: ['Wi-Fi', 'Electricity', 'Water', 'Security', 'Parking', 'Gym', 'Study Area', 'Kitchen', 'Laundry'],
    rooms: [
      { id: 'r1', type: 'Private', capacity: 1, price: 5200, available: 3, bathroom: 'En-suite', furnished: true },
      { id: 'r2', type: 'Apartment', capacity: 2, price: 7800, available: 5, bathroom: 'Shared', furnished: true },
    ],
    manager: { name: 'Priya Naidoo', responseTime: '< 2 hours', verified: true },
    rules: ['No smoking indoors', 'Pets not allowed', 'Quiet hours 23:00–07:00', 'Recycle and dispose waste correctly'],
    tags: ['Wi-Fi', 'Gym', 'Furnished', 'Near Campus'],
  },
  {
    id: 'p3',
    name: 'Stellenbosch Student Village',
    type: 'Apartment',
    university: 'stellenbosch',
    city: 'Stellenbosch',
    address: '22 Bird Street, Stellenbosch',
    distance: 0.5,
    price: 4100,
    rating: 4.9,
    reviews: 201,
    available: 5,
    verified: true,
    description:
      'Nestled in the historic heart of Stellenbosch, our student village combines charming Cape Dutch architecture with modern student amenities. Bicycle-friendly complex with secure storage and garden common areas.',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=500&fit=crop&auto=format',
    ],
    amenities: ['Wi-Fi', 'Electricity', 'Water', 'Security', 'Laundry', 'Study Area', 'Kitchen', 'Parking'],
    rooms: [
      { id: 'r1', type: 'Private', capacity: 1, price: 4100, available: 2, bathroom: 'En-suite', furnished: true },
      { id: 'r2', type: 'Shared', capacity: 2, price: 2600, available: 3, bathroom: 'Shared', furnished: true },
    ],
    manager: { name: 'Liezel van der Berg', responseTime: '< 30 min', verified: true },
    rules: ['No smoking', 'Bicycle storage available', 'Monthly room inspections', 'Keep noise levels considerate'],
    tags: ['Near Campus', 'Wi-Fi', 'Furnished', 'Available Now'],
  },
  {
    id: 'p4',
    name: 'UCT Rondebosch Residence',
    type: 'Residence',
    university: 'uct',
    city: 'Cape Town',
    address: '8 Woolsack Drive, Rondebosch',
    distance: 0.3,
    price: 6200,
    rating: 4.7,
    reviews: 156,
    available: 3,
    verified: true,
    description:
      'Situated at the foot of Devil\'s Peak, this premium residence offers spectacular mountain views and direct access to UCT\'s upper campus.',
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=500&fit=crop&auto=format',
    ],
    amenities: ['Wi-Fi', 'Electricity', 'Water', 'Security', 'Gym', 'Study Area', 'Kitchen', 'Laundry'],
    rooms: [
      { id: 'r1', type: 'Private', capacity: 1, price: 6200, available: 1, bathroom: 'En-suite', furnished: true },
      { id: 'r2', type: 'Shared', capacity: 2, price: 3800, available: 2, bathroom: 'Shared', furnished: true },
    ],
    manager: { name: 'Amahle Dlamini', responseTime: '< 1 hour', verified: true },
    rules: ['Quiet hours 22:00–07:00', 'No open flames', 'Visitors out by 22:00', 'Academic commitment required'],
    tags: ['Near Campus', 'Wi-Fi', 'Gym', 'Security'],
  },
  {
    id: 'p5',
    name: 'Durban Student Lofts',
    type: 'Apartment',
    university: 'ukzn',
    city: 'Durban',
    address: '33 Howard College Rd, Glenwood',
    distance: 1.5,
    price: 3900,
    rating: 4.5,
    reviews: 67,
    available: 9,
    verified: false,
    description:
      'Modern loft-style apartments designed for UKZN students in the vibrant Glenwood neighbourhood.',
    images: [
      'https://images.unsplash.com/photo-1630699144867-37acec97df5a?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=500&fit=crop&auto=format',
    ],
    amenities: ['Wi-Fi', 'Electricity', 'Water', 'Security', 'Laundry', 'Kitchen'],
    rooms: [
      { id: 'r1', type: 'Studio', capacity: 1, price: 3900, available: 5, bathroom: 'En-suite', furnished: false },
      { id: 'r2', type: 'Shared', capacity: 2, price: 2400, available: 4, bathroom: 'Shared', furnished: false },
    ],
    manager: { name: 'Roshan Govender', responseTime: '< 3 hours', verified: true },
    rules: ['No smoking', 'Respect neighbours', 'Keep parking area clear'],
    tags: ['Under R5,000', 'Wi-Fi', 'Available Now'],
  },
];

export type Conversation = {
  id: string;
  manager: string;
  property: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  messages: Message[];
};

export type Message = {
  id: string;
  sender: 'student' | 'manager';
  text: string;
  time: string;
};

export const conversations: Conversation[] = [
  {
    id: 'c1',
    manager: 'Thabo Mkhize',
    property: 'Campus View Residence',
    avatar: 'TM',
    lastMessage: 'Yes, we currently have two private rooms available for September.',
    time: '10:32',
    unread: 2,
    messages: [
      { id: 'm1', sender: 'student', text: 'Hi, is a private room available for September?', time: '10:28' },
      { id: 'm2', sender: 'manager', text: 'Hi! Thanks for reaching out. Yes, we currently have two private rooms available for September.', time: '10:30' },
      { id: 'm3', sender: 'manager', text: 'Both are en-suite and fully furnished. Would you like to schedule a viewing?', time: '10:32' },
    ],
  },
  {
    id: 'c2',
    manager: 'Priya Naidoo',
    property: 'Varsity Heights',
    avatar: 'PN',
    lastMessage: 'The application process takes about 3–5 business days.',
    time: 'Yesterday',
    unread: 0,
    messages: [
      { id: 'm1', sender: 'student', text: 'What documents do I need to apply?', time: 'Yesterday' },
      { id: 'm2', sender: 'manager', text: 'You will need your student ID, proof of registration, and proof of funding.', time: 'Yesterday' },
      { id: 'm3', sender: 'manager', text: 'The application process takes about 3–5 business days.', time: 'Yesterday' },
    ],
  },
];

export type AppNotification = {
  id: string;
  type: 'booking' | 'payment' | 'message' | 'application' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export const notifications: AppNotification[] = [
  { id: 'n1', type: 'booking', title: 'Application Approved!', message: 'Your application for Campus View Residence has been approved. Welcome home!', time: '2 min ago', read: false },
  { id: 'n2', type: 'payment', title: 'Payment Due Soon', message: 'Your rent payment of R3,500 is due in 3 days.', time: '1 hour ago', read: false },
  { id: 'n3', type: 'message', title: 'New Message', message: 'Thabo Mkhize sent you a message about Campus View Residence.', time: '3 hours ago', read: true },
  { id: 'n4', type: 'application', title: 'Documents Verified', message: 'Your uploaded documents for Varsity Heights have been verified.', time: 'Yesterday', read: true },
  { id: 'n5', type: 'system', title: 'Profile Updated', message: 'Your student profile has been successfully updated.', time: '2 days ago', read: true },
];
