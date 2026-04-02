export interface Destination {
  id: string;
  title: string;
  location: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  signalStrength: 0 | 1 | 2; // 0 = No signal, 1 = Weak, 2 = Spotty
  tags: string[];
  features: string[];
  valor_venda?: number;
  bairro?: string;
  quantidade_quartos?: number;
}

export interface Experience {
  id: string;
  title: string;
  instructor: string;
  description: string;
  price: number;
  image: string;
  category: 'Workshop' | 'Meditation' | 'Craft' | 'Astronomy';
}

export interface SurvivalKit {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  items: string[];
}

export const DESTINATIONS: Destination[] = [
  {
    id: '1',
    title: 'Retiro do Vale Silencioso',
    location: 'Patagônia, Chile',
    description: 'Um santuário esculpido nos picos de granito dos Andes. Cobertura de satélite zero, presença absoluta.',
    price: 850,
    image: 'https://images.unsplash.com/photo-1500313830540-7b6650a74fd0?auto=format&fit=crop&q=80&w=1000',
    signalStrength: 0,
    tags: ['Montanha', 'Isolado', 'Luxo'],
    features: ['Cofre de Dispositivos', 'Biblioteca Analógica', 'Spa a Lenha']
  },
  {
    id: '2',
    title: 'Eco das Dunas Lodge',
    location: 'Deserto do Namibe, Namíbia',
    description: 'Ouça o movimento das areias em um lugar onde a torre de celular mais próxima está a 400km.',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&q=80&w=1000',
    signalStrength: 0,
    tags: ['Deserto', 'Observação de Estrelas', 'Arquitetura'],
    features: ['Deck ao Ar Livre', 'Suíte com Telescópio', 'Apenas Energia Solar']
  },
  {
    id: '3',
    title: 'Cabana Névoa e Musgo',
    location: 'Ilha de Skye, Escócia',
    description: 'Um refúgio de concreto brutalista escondido na névoa. A única conexão é com os elementos.',
    price: 650,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1000',
    signalStrength: 1,
    tags: ['Costeiro', 'Nevoeiro', 'Minimalista'],
    features: ['Escrivaninha com Máquina de Escrever', 'Coleção de Vinil', 'Banho de Água da Chuva']
  }
];

export const EXPERIENCES: Experience[] = [
  {
    id: 'e1',
    title: 'Workshop de Fotografia Analógica',
    instructor: 'Elena Rossi',
    description: 'Domine a arte do filme 35mm. Desenvolva suas próprias impressões em nossa câmara escura na montanha.',
    price: 250,
    image: 'https://images.unsplash.com/photo-1495121553079-4c61bbbc19df?auto=format&fit=crop&q=80&w=1000',
    category: 'Workshop'
  },
  {
    id: 'e2',
    title: 'Navegação Celestial',
    instructor: 'Dr. Aris Thorne',
    description: 'Aprenda a encontrar seu caminho usando apenas as estrelas e um sextante de latão.',
    price: 180,
    image: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bcc0?auto=format&fit=crop&q=80&w=1000',
    category: 'Astronomy'
  }
];

export const SURVIVAL_KITS: SurvivalKit[] = [
  {
    id: 'k1',
    name: 'O Kit Cronista',
    price: 145,
    description: 'Tudo o que você precisa para documentar sua jornada sem uma tela.',
    image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1000',
    items: ['Diário de Couro', 'Caneta Tinteiro de Latão', 'Mapa Topográfico de Papel', 'Conjunto de Selo de Cera']
  },
  {
    id: 'k2',
    name: 'O Kit Observador',
    price: 220,
    description: 'Melhore sua experiência sensorial na natureza.',
    image: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=1000',
    items: ['Binóculos Vintage', 'Guia de Campo para Flora', 'Bloco de Desenho', 'Lápis de Carvão']
  }
];
