import { UserProfile, TopArtists, TopTracks } from "./interfaces";

const clientId = "16ed7b7faf094b429335cfc77338edd1";
const scopes = "user-read-private user-read-email user-top-read"
const params = new URLSearchParams(window.location.search);
//const redirect_uri = "http://localhost:5173/callback";
const redirect_uri = "https://spotify-top-3.netlify.app/this-page-exists";
const code = params.get("code");

document.getElementById("login-btn")?.addEventListener("click", loginToSpotify);

async function loginToSpotify() {
  if (!code) {
    redirectToAuthCodeFlow(clientId);
  }
}

async function loadAccessToken() {
  let accessToken 
  if (code) {

    if(!localStorage.getItem("access_token")){
      accessToken = (await getAccessToken(clientId, code))
    } else {
      accessToken = localStorage.getItem("access_token")
    }
   /*  const accessToken =
      localStorage.getItem("access_token") ||
      (await getAccessToken(clientId, code)); */
  
    const refresh_token = await getRefreshToken();
  
    localStorage.setItem("refresh_token", refresh_token);
  
    fetchItems(accessToken);

    history.pushState(null, '', 'https://spotify-top-3.netlify.app/');

  }
}

loadAccessToken()

async function getRefreshToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  const url = "https://accounts.spotify.com/api/token";

  const payload = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken ?? "",
      client_id: clientId,
    }),
  };
  const body = await fetch(url, payload);
  const response = await body.json();

  localStorage.setItem("access_token", response.access_token);

  return response.refresh_token;
}

async function fetchItems(accessToken: any) {
  const profileData = await fetchProfile(accessToken);

  const topArtistsData = await fetchTopItems(
    accessToken,
    "artists",
    "short_term",
    "3"
  );
  const topTracksData = await fetchTopItems(
    accessToken,
    "tracks",
    "short_term",
    "3"
  );

  const profile = {
    userName: profileData.display_name,
    profileUrl: profileData.external_urls.spotify,
    profileImage: profileData.images[0],
  };

  const topArtists = topArtistsData.items.map((artist: any) => {
    return {
      artistName: artist.name,
      artistGenre: artist.genres,
      artistUrl: artist.external_urls.spotify,
      artistImage: artist.images[0].url,
    };
  });

  const topTracks = topTracksData.items.map((track: any) => {
    return {
      trackName: track.name,
      trackArtists: track.artists.map((artist: any) => {
        return {
          name: artist.name,
          url: artist.external_urls.spotify,
        };
      }),
      trackAlbum: {
        name: track.album.name,
        releaseDate: track.album.release_date,
        url: track.album.external_urls.spotify,
        cover: track.album.images[0].url,
      },
      trackUrl: track.external_urls.spotify,
      trackPreview: track.preview_url,
    };
  });

  populateUI(profile, topArtists, topTracks);
}

async function redirectToAuthCodeFlow(clientId: string) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", redirect_uri);
  params.append("scope", scopes);
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(
  clientId: string,
  code: any
): Promise<string> {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("code_verifier", verifier!);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  console.log(await result.json());

  const { access_token, refresh_token } = await result.json();

  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);

  return access_token;
}

async function fetchProfile(token: string): Promise<any> {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return await result.json();
}

async function fetchTopItems(
  token: string,
  itemType: string,
  timeRange: string,
  limit: string
): Promise<any> {
  const result = await fetch(
    `https://api.spotify.com/v1/me/top/${itemType}?time_range=${timeRange}&limit=${limit}&offset=0`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return await result.json();
}

function populateUI(
  profile: UserProfile,
  topArtists: TopArtists,
  topTracks: TopTracks
) {
  document.getElementById("profile")!.innerHTML = `
    <img src=${profile.profileImage || `https://robohash.org/${profile.userName}.png`} alt="">
    <a href=${profile.profileUrl} target="_blank">
      <p id="username">${profile.userName}</p>
    </a>
  `;

  document.getElementById("top-artists")!.innerHTML = topArtists
    .map((artist: any) => {
      return `
      <li>
        <a href=${artist.artistUrl} target="_blank">
          <h3>${artist.artistName}</h3>
        </a>
        <img src=${artist.artistImage}>
        <span>${artist.artistGenre.join(" | ")}</span>
      </li>
    `;
    })
    .join("");

  document.getElementById("top-tracks")!.innerHTML = topTracks
    .map((track: any) => {
      return `
      <li>
        <a href=${track.trackUrl} target="_blank">
          <h3>${track.trackName}</h3>
        </a>

        <span>${track.trackArtists
          .map((artist: any) => `<a href=${artist.url} target="_blank">
            ${artist.name}
          </a>`)
          .join(" | ")}
        </span>
        
        <p>
          <a href=${track.trackAlbum.url} target="_blank">
            ${track.trackAlbum.name}
          </a> | <span>${track.trackAlbum.releaseDate}</span>
        </p>
        <img src=${track.trackAlbum.cover} />
      </li>
    `;
    })
    .join("");
}
