export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super-admin' | 'clinic-admin' | 'staff' | 'clinician' | 'sales';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  planType: 'basic' | 'standard' | 'premium';
  price: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expired';
  notes: string;
}

export interface Therapy {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  status: 'active' | 'inactive';
}

export interface Booking {
  id: string;
  memberId: string;
  therapistId: string;
  therapyId: string;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
}

export interface DNATest {
  id: string;
  memberId: string;
  testDate: string;
  status: 'not-started' | 'in-progress' | 'completed';
  notes: string;
}

export interface Report {
  id: string;
  memberId: string;
  reportType: 'membership' | 'therapy-progress' | 'dna-analysis' | 'financial';
  generatedDate: string;
  downloadUrl: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: 'website' | 'referral' | 'social-media' | 'direct' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  createdAt: string;
  notes: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, { before: any; after: any }>;
  timestamp: string;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Sarah Johnson',
    email: 'sarah@clinic.com',
    phone: '+1-555-0101',
    role: 'super-admin',
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: 'u2',
    name: 'Michael Chen',
    email: 'michael@clinic.com',
    phone: '+1-555-0102',
    role: 'clinic-admin',
    status: 'active',
    createdAt: '2024-01-20',
  },
  {
    id: 'u3',
    name: 'Dr. Emily Rodriguez',
    email: 'emily@clinic.com',
    phone: '+1-555-0103',
    role: 'clinician',
    status: 'active',
    createdAt: '2024-02-01',
  },
  {
    id: 'u4',
    name: 'James Wilson',
    email: 'james@clinic.com',
    phone: '+1-555-0104',
    role: 'clinician',
    status: 'active',
    createdAt: '2024-02-05',
  },
  {
    id: 'u5',
    name: 'Lisa Park',
    email: 'lisa@clinic.com',
    phone: '+1-555-0105',
    role: 'staff',
    status: 'active',
    createdAt: '2024-02-10',
  },
  {
    id: 'u6',
    name: 'David Brown',
    email: 'david@clinic.com',
    phone: '+1-555-0106',
    role: 'sales',
    status: 'active',
    createdAt: '2024-02-15',
  },
  {
    id: 'u7',
    name: 'Amanda Price',
    email: 'amanda@clinic.com',
    phone: '+1-555-0107',
    role: 'staff',
    status: 'inactive',
    createdAt: '2024-01-10',
  },
];

// Mock Memberships
export const mockMemberships: Membership[] = [
  {
    id: 'm1',
    userId: 'member1',
    planType: 'premium',
    price: 299.99,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active',
    notes: 'Premium member with weekly sessions',
  },
  {
    id: 'm2',
    userId: 'member2',
    planType: 'standard',
    price: 199.99,
    startDate: '2024-02-01',
    endDate: '2024-08-01',
    status: 'active',
    notes: 'Bi-weekly therapy sessions',
  },
  {
    id: 'm3',
    userId: 'member3',
    planType: 'basic',
    price: 99.99,
    startDate: '2023-12-01',
    endDate: '2024-03-01',
    status: 'expired',
    notes: 'Monthly sessions only',
  },
  {
    id: 'm4',
    userId: 'member4',
    planType: 'premium',
    price: 299.99,
    startDate: '2024-01-15',
    endDate: '2025-01-15',
    status: 'active',
    notes: 'Includes DNA testing',
  },
  {
    id: 'm5',
    userId: 'member5',
    planType: 'standard',
    price: 199.99,
    startDate: '2024-03-01',
    endDate: '2024-09-01',
    status: 'active',
    notes: 'Therapy + wellness coaching',
  },
];

// Mock Therapies
export const mockTherapies: Therapy[] = [
  {
    id: 'th1',
    name: 'Cognitive Behavioral Therapy',
    category: 'Mental Health',
    description: 'Evidence-based therapy for anxiety and depression',
    price: 120,
    duration: 60,
    status: 'active',
  },
  {
    id: 'th2',
    name: 'Massage Therapy',
    category: 'Physical Wellness',
    description: 'Therapeutic massage for stress relief',
    price: 100,
    duration: 60,
    status: 'active',
  },
  {
    id: 'th3',
    name: 'Nutritional Counseling',
    category: 'Wellness',
    description: 'Personalized nutrition plans',
    price: 80,
    duration: 45,
    status: 'active',
  },
  {
    id: 'th4',
    name: 'Yoga & Meditation',
    category: 'Mind-Body',
    description: 'Guided yoga and meditation sessions',
    price: 60,
    duration: 60,
    status: 'active',
  },
  {
    id: 'th5',
    name: 'Acupuncture',
    category: 'Traditional Medicine',
    description: 'Traditional Chinese medicine acupuncture',
    price: 90,
    duration: 45,
    status: 'active',
  },
  {
    id: 'th6',
    name: 'Couples Therapy',
    category: 'Relationships',
    description: 'Relationship and couples counseling',
    price: 150,
    duration: 60,
    status: 'inactive',
  },
];

// Mock Bookings
export const mockBookings: Booking[] = [
  {
    id: 'b1',
    memberId: 'member1',
    therapistId: 'u3',
    therapyId: 'th1',
    date: '2024-03-20',
    time: '10:00',
    duration: 60,
    status: 'confirmed',
    notes: 'Follow up session',
  },
  {
    id: 'b2',
    memberId: 'member2',
    therapistId: 'u4',
    therapyId: 'th2',
    date: '2024-03-21',
    time: '14:00',
    duration: 60,
    status: 'confirmed',
    notes: '',
  },
  {
    id: 'b3',
    memberId: 'member3',
    therapistId: 'u3',
    therapyId: 'th4',
    date: '2024-03-19',
    time: '09:00',
    duration: 60,
    status: 'completed',
    notes: 'Patient showed good progress',
  },
  {
    id: 'b4',
    memberId: 'member4',
    therapistId: 'u4',
    therapyId: 'th3',
    date: '2024-03-22',
    time: '15:30',
    duration: 45,
    status: 'pending',
    notes: 'Initial consultation',
  },
  {
    id: 'b5',
    memberId: 'member5',
    therapistId: 'u3',
    therapyId: 'th1',
    date: '2024-03-18',
    time: '11:00',
    duration: 60,
    status: 'cancelled',
    notes: 'Patient requested cancellation',
  },
];

// Mock DNA Tests
export const mockDNATests: DNATest[] = [
  {
    id: 'd1',
    memberId: 'member1',
    testDate: '2024-02-15',
    status: 'completed',
    notes: 'Results ready for review',
  },
  {
    id: 'd2',
    memberId: 'member2',
    testDate: '2024-03-01',
    status: 'in-progress',
    notes: 'Awaiting lab results',
  },
  {
    id: 'd3',
    memberId: 'member3',
    testDate: '2024-03-15',
    status: 'not-started',
    notes: 'Kit has been sent',
  },
  {
    id: 'd4',
    memberId: 'member4',
    testDate: '2024-01-20',
    status: 'completed',
    notes: 'Genetic predisposition analysis complete',
  },
];

// Mock Reports
export const mockReports: Report[] = [
  {
    id: 'r1',
    memberId: 'member1',
    reportType: 'therapy-progress',
    generatedDate: '2024-03-15',
    downloadUrl: '/reports/therapy-progress-m1.pdf',
  },
  {
    id: 'r2',
    memberId: 'member2',
    reportType: 'membership',
    generatedDate: '2024-03-10',
    downloadUrl: '/reports/membership-m2.pdf',
  },
  {
    id: 'r3',
    memberId: 'member4',
    reportType: 'dna-analysis',
    generatedDate: '2024-03-01',
    downloadUrl: '/reports/dna-analysis-m4.pdf',
  },
  {
    id: 'r4',
    memberId: 'member1',
    reportType: 'financial',
    generatedDate: '2024-03-01',
    downloadUrl: '/reports/financial-m1.pdf',
  },
];

// Mock Leads
export const mockLeads: Lead[] = [
  {
    id: 'l1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-1001',
    source: 'website',
    status: 'new',
    createdAt: '2024-03-16',
    notes: 'Interested in therapy services',
  },
  {
    id: 'l2',
    name: 'Rachel Green',
    email: 'rachel.green@email.com',
    phone: '+1-555-1002',
    source: 'referral',
    status: 'contacted',
    createdAt: '2024-03-14',
    notes: 'Referred by existing member',
  },
  {
    id: 'l3',
    name: 'Marcus Johnson',
    email: 'marcus.j@email.com',
    phone: '+1-555-1003',
    source: 'social-media',
    status: 'qualified',
    createdAt: '2024-03-12',
    notes: 'Wants premium membership',
  },
  {
    id: 'l4',
    name: 'Sophie Williams',
    email: 'sophie.w@email.com',
    phone: '+1-555-1004',
    source: 'direct',
    status: 'converted',
    createdAt: '2024-03-01',
    notes: 'Converted to member1 - premium plan',
  },
  {
    id: 'l5',
    name: 'Tom Anderson',
    email: 'tom.a@email.com',
    phone: '+1-555-1005',
    source: 'website',
    status: 'lost',
    createdAt: '2024-02-20',
    notes: 'Not interested in pricing',
  },
];

// Mock Audit Logs
export const mockAuditLogs: AuditLog[] = [
  {
    id: 'al1',
    userId: 'u1',
    action: 'created',
    entityType: 'membership',
    entityId: 'm1',
    changes: {
      planType: { before: null, after: 'premium' },
      price: { before: null, after: 299.99 },
    },
    timestamp: '2024-03-15 10:30:00',
  },
  {
    id: 'al2',
    userId: 'u2',
    action: 'updated',
    entityType: 'booking',
    entityId: 'b1',
    changes: {
      status: { before: 'pending', after: 'confirmed' },
    },
    timestamp: '2024-03-15 09:15:00',
  },
  {
    id: 'al3',
    userId: 'u6',
    action: 'created',
    entityType: 'lead',
    entityId: 'l1',
    changes: {
      name: { before: null, after: 'John Smith' },
      status: { before: null, after: 'new' },
    },
    timestamp: '2024-03-16 14:45:00',
  },
  {
    id: 'al4',
    userId: 'u3',
    action: 'updated',
    entityType: 'dna-test',
    entityId: 'd2',
    changes: {
      status: { before: 'not-started', after: 'in-progress' },
    },
    timestamp: '2024-03-14 11:20:00',
  },
];
