import { NormalizedProfile } from './normalized-profile.interface';

export interface ProfileProvider {
  fetchProfile(username: string): Promise<NormalizedProfile>;
}
