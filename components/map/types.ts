export interface MapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  primary: boolean;
  photoUrl: string | null;
}
