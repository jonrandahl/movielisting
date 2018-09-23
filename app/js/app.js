

 const tmdb = "https://api.themoviedb.org/3/";
 const api_key = "6f981a18477d5a7d8c53fb62f8b54ee8";

 ///Fat-arrow functions are great if you need to control "this" - this function doesn't.
 const setSearchWatch = function() {
  /// while I could have used document.querySelector this is unique to only
  /// this form and therefore both more readable as well as more performant
  /// https://www.sitepoint.com/community/t/getelementbyid-vs-queryselector/280663
  const form = document.getElementById('searchForm');
  form.addEventListener("submit", event => {
    event.preventDefault();
    let term = document.getElementById('searchTerm').value;
    searchMovies(term);
  });
 };
/// DRY - pass in the path and/or parameters you need and get an API url in return
 const generateApiUrl = (pathname,searchParams = {}) => {
  let params = [];
  let newUrl = new URL(pathname, tmdb);
  if ('URLSearchParams' in window) {
    params = new URLSearchParams(newUrl.search);
    params.append('api_key', api_key);
    newUrl.search = params;
  } else {
    newUrl.search = "api_key="+api_key;
  }
  if (searchParams.length > 0){
    for(let pair of searchParams){
      let [key, value] = pair;
      params.append(key, value);
    }
    newUrl.search.append(params);
  }
  return newUrl;
 };
 /// DRY - find the needle in the haystack
 const filterArray = (needle, haystack, bucket) => {
  const newArray = bucket.map((m) => {
    let f = haystack.find(g => g[needle] === m);
    return f;
  });
  return newArray;
 };

 ///if we need to have authentication for the queries, then we can use this to generate the auth token
function requestAccess(){
  if (!sessionStorage.getItem("auth_token")){
    const tokenUrl = generateApiUrl('authentication/guest_session/new');
    axios.get(tokenUrl)
    .then((response) => {
      let auth_token = response.data.guest_session_id;
      sessionStorage.setItem("auth_token", auth_token);
    })
    .catch((err)=> {
      console.error(err);
    });
  }
}
/// To return a movie listing based on the requested parameters
 function searchMovies(movies){
  console.log("searching for:", movies);
  axios.get(generateApiUrl('search/movie'))
    .then( (response) => {
      console.log(response);
    })
    .catch((err) => {
      console.error(err);
    });
}
/// Get the current genres available from the TMDB API
function getGenres(){
    const genreUrl = generateApiUrl('genre/movie/list');
    axios.get(genreUrl)
      .then((response) => {
        localStorage.setItem("currentGenres", JSON.stringify(response.data.genres));
        return response.data.genres;
      })
      .catch((err)=>{
        console.error(err);
      });
}
///Get the latest list of latest movies from the TMDB API
function getLatestMovies() {
    let latestUrl = generateApiUrl('movie/now_playing');
    axios.get(latestUrl)
      .then((response) => {
        const latestMovies = response.data.results.sort((a,b) => b.popularity - a.popularity);
        localStorage.setItem("latestMovies", JSON.stringify(latestMovies));
        return latestMovies;
      })
      .catch((err)=>{
        console.error(err);
      });
}
/// Send the results as template strings to their respective parent elements
function renderMovieListing(filtered = []){

  let availableGenres = localStorage.getItem("currentGenres") ? JSON.parse(localStorage.getItem("currentGenres")) : getGenres();

  let filmstrip = '';
  let movies = localStorage.getItem("latestMovies") ? JSON.parse(localStorage.getItem("latestMovies")) : getLatestMovies();
  let movieGenres = [];

  if (filtered.length > 0){
    console.log(filtered);
    return movies.filter((el) => el.genre_ids.some(g=>filtered.some(genre => genre === g)));
  }

  console.log(movies);

  for(let movie of movies){
    movieGenres.push(... new Set(movie.genre_ids));
    const filmGenres = filterArray("id", availableGenres, movie.genre_ids);
    filmstrip += `
      <figure class="movie">
        <img class="movie--poster" srcset="https://image.tmdb.org/t/p/w342/${movie.poster_path} 320w, https://image.tmdb.org/t/p/w500/${movie.poster_path} 480w, https://image.tmdb.org/t/p/original/${movie.poster_path} 800w" sizes="(max-width: 320px) 280px, (max-width: 480px) 440px, 800px" src="https://image.tmdb.org/t/p/w92/${movie.poster_path}" alt="${movie.title} Poster" />
        <figcaption class="movie--credits">
          <h2 class="movie--title">${movie.title}</h2>
          <ul class="movie--genres tags">
            ${filmGenres.map(genre => (`<li class="genre tag">${genre.name}</li>`)).join('')}
          </ul>
        </figcaption>
      </figure>
    `;
  }
//set the cinema content to the template strings
  document.getElementById('cinema').innerHTML = filmstrip;
//get unique set of genres to filter against available genres from api
  const currentGenres = [...new Set(movieGenres)];
//filter the current genres to create a new object
  const filmGenres = filterArray("id", availableGenres,currentGenres);

  let genres = '';

  for(let genre of filmGenres ){
    let name = genre.name.replace(" ","_").toLowerCase();
    let id = genre.id;
    genres += `
      <li class="genre tag">
        <input class="genre--selector" type="checkbox" id="${name}-${id}" name="genre-tags" value="${id}">
        <label for="${name}-${id}" name="${name}-label">${genre.name}</label>
      </li>`;
  }
  document.getElementById('genres').innerHTML = genres;
  const selectedGenres = setGenreFilters();
  console.log(selectedGenres);
}

function setGenreFilters() {
  const selectedGenres = [];
  const tags = document.querySelector('.genre.tags');
  tags.addEventListener('click', (e) => {
    const tagbox = e.target.closest('[type="checkbox"]');
    if (tagbox && tags.contains(tagbox)){
      if (selectedGenres.includes(tagbox.value)){
        selectedGenres.splice(selectedGenres.indexOf(tagbox.value),1);
      }
      else {
        selectedGenres.push(tagbox.value);
      }
    }

    return selectedGenres;
  });
}


 /// While we could just apply the method to the window object,
 /// we don't want to stop rendering of the page with scripts!
 if (document.readyState === "loading") {
  document.addEventListener('DOMContentLoaded', renderMovieListing);
 } else {
  renderMovieListing();
 }