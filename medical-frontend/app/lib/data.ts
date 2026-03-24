// These "interfaces" tell TypeScript exactly what to expect
export interface Category {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export interface Doctor {
  name: string;
  role: string;
  available: string;
  image: string;
}

export const CATEGORIES: Category[] = [
  { id: "cardiology", name: "Heart Health", icon: "❤️", desc: "BP, Heart rate, ECG" },
  { id: "neurology", name: "Brain & Nerves", icon: "🧠", desc: "Headaches, Focus, Sleep" },
  { id: "dermatology", name: "Skin Care", icon: "💧", desc: "Rashes, Acne, Glow" },
  { id: "nutrition", name: "Nutrition", icon: "🥗", desc: "Diet, Weight, Energy" },
];

export const DOCTORS: Record<string, Doctor[]> = {
  cardiology: [
    { name: "Dr. Sarah Smith", role: "Chief Cardiologist", available: "Now", image: "bg-blue-100" },
    { name: "Dr. James Doe", role: "Surgeon", available: "10:00 AM", image: "bg-blue-200" },
  ],
  neurology: [
    { name: "Dr. Emily Yu", role: "Neuroscientist", available: "Now", image: "bg-purple-100" },
  ],
  dermatology: [
    { name: "Dr. Mike Ross", role: "Dermatologist", available: "2:00 PM", image: "bg-teal-100" },
  ],
  nutrition: [
    { name: "Dr. Lisa Ray", role: "Dietitian", available: "Now", image: "bg-green-100" },
  ]
};