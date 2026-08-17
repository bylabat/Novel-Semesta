export interface Novel {
  id: string;
  title: string;
  author: string;
  cover: string;
  genres: string[];
  rating: number;
  ratingCount: number;
  views: string;
  status: 'Ongoing' | 'Completed' | 'Hiatus';
  chapterCount: number;
  latestChapter: string;
  description: string;
  isNew?: boolean;
  isHot?: boolean;
}

export interface Genre {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface HeroSlide {
  id: string;
  badge: string;
  title: string;
  description: string;
  genres: string[];
  cover: string;
}
