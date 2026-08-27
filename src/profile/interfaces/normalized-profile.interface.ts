export interface LocationInfo {
  city?: string;
  state?: string;
  country?: string;
  raw?: string;
}

export interface Period {
  startDate?: string; // Format: YYYY-MM or YYYY
  endDate?: string;   // Format: YYYY-MM or YYYY, null if present/current
}

export interface ExperienceEntry {
  company: string;
  title: string;
  location?: string;
  period?: Period;
  description?: string;
  logoUrl?: string;
}

export interface EducationEntry {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  period?: Period;
  description?: string;
}

export interface CertificationEntry {
  name: string;
  authority?: string;
  licenseNumber?: string;
  url?: string;
  period?: Period;
}

export interface LanguageEntry {
  name: string;
  proficiency?: string;
}

export interface NormalizedProfile {
  profileUrl: string;
  name: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  location?: LocationInfo;
  about?: string;
  profileImage?: string;
  backgroundImage?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
}
