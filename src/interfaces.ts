interface UserProfile {
  userName: string;
  profileUrl: string;
  profileImage: string;
}

interface TopArtists {
  artistName: string;
  artistGenre: string[];
  artistUrl: string;
  artistImage: string;
}

interface TopTracks {
  trackName: string;
  trackArtists: object[];
  trackAlbum: {
    name: string;
    releaseDate: string;
    url: string;
    cover: string;
  };
  trackUrl: string;
  trackPreview: string;
}

export type { UserProfile, TopArtists, TopTracks };
