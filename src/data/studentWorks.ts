export type StudentWork = {
  studentName: string;
  title: string;
  description: string;
  href: string;
  platform: string;
  year?: string;
  tags?: string[];
  embed?: {
    title: string;
    src: string;
    width: number;
    height: number;
  };
  playEmbed?: {
    title: string;
    src: string;
    width: number;
    height: number;
  };
};

export const studentWorks: StudentWork[] = [
  {
    studentName: "Oravecz Ádám",
    title: "Dosimeter",
    description:
      "Hallgatoi itch.io projekt, amely kozvetlenul a MOSZE oldalrol is kiprobalhato.",
    href: "https://fokos001.itch.io/",
    platform: "itch.io",
    year: "2026",
    tags: ["Game", "itch.io", "Playable"],
    embed: {
      title: "Dosimeter by Fokos001",
      src: "https://itch.io/embed/4511489?dark=true",
      width: 552,
      height: 167,
    },
    playEmbed: {
      title: "Play Dosimeter on itch.io",
      src: "https://itch.io/embed-upload/17314032?color=4f4f4f",
      width: 960,
      height: 560,
    },
  },
];
