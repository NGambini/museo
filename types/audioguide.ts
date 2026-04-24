type AudioGuide = {
  id: string;
  title: string;
  description: string;
  image: number;
  chapters: {
    title: string;
    description: string;
    imageUrl: string;
    audioUrl: string;
  }[];
};

export default AudioGuide;