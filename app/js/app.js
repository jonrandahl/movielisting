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
/// To return a movie listing based on the requested parameters ~ unused
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
/// base reader from the locally stored movie feed.
/// defaults to filter the movies by the rating of 3 or better
/// also accepts an array of genre ids to then filter the list from too
function setMovieListing(filters = "3", filter = "genre_ids"){
  try{
    let movies = localStorage.getItem("latestMovies") ? JSON.parse(localStorage.getItem("latestMovies")) : getLatestMovies();
    let filteredMovies = movies; ///create a default object to start with
    //Now see if we've passed in an Array to filter by, which needs to go a bit deeper?
    if (Array.isArray(filters) && filters.length > 0){
      filteredMovies = movies.filter((m) => m[filter].some(s=>filters.some(sieve => sieve === s)));
    }
    //Otherwise the filter is a string, more than likely to be
    if (typeof filters === 'string' || filters instanceof String){
      filteredMovies = movies.filter((m) => m[filter] >= filters);
    }
    renderMovieListing(filteredMovies);
  }catch(err){
    console.error(err);
  }
}

/// Send the results as template strings to their respective parent elements
function renderMovieListing(movies){
  let filmstrip = '';
  let movieGenres = [];

  let availableGenres = localStorage.getItem("currentGenres") ? JSON.parse(localStorage.getItem("currentGenres")) : getGenres();

  for(let movie of movies){
    movieGenres.push(... new Set(movie.genre_ids));
    const filmGenres = filterArray("id", availableGenres, movie.genre_ids);
    filmstrip += `
      <figure class="movie">
        <img class="movie--poster" srcset="https://image.tmdb.org/t/p/w342/${movie.poster_path} 320w, https://image.tmdb.org/t/p/w500/${movie.poster_path} 480w, https://image.tmdb.org/t/p/original/${movie.poster_path} 800w" sizes="(max-width: 320px) 280px, (max-width: 480px) 440px, 800px" src="https://image.tmdb.org/t/p/w92/${movie.poster_path}" alt="${movie.title} Poster" />
        <figcaption class="movie--credits">
          <h2 class="movie--title">${movie.title}</h2>
          <h3 class="movie--rating">Rating: ${movie.vote_average}</h3>
          <ul class="movie--genres tags">
            ${filmGenres.map(genre => (`<li class="genre tag"><span class="tag-label">${genre.name}</span></li>`)).join('')}
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
        <label class="tag-label" for="${name}-${id}" name="${name}-label">${genre.name}</label>
      </li>`;
  }
  document.getElementById('genres').innerHTML = genres;

}

/// Get the lected genres for the filter movie button and set the click
/// event to trigger the (re)filtering of the view.
//
const genreFilter = document.querySelector('.genre_filter--trigger');
genreFilter.addEventListener('click', (e)=>{
  e.preventDefault();
  let selectedGenres = [];
  let tags = document.querySelectorAll(':checked');
  for (let tag of tags){
    selectedGenres.push(parseInt(tag.value));
  }
  setMovieListing(selectedGenres);
});

const ratingSlider = document.querySelector('#ratingSlider');
ratingSlider.addEventListener('change', (e) => {
  let rating = e.target.value;
  document.querySelector('.current-rating').lastChild.innerHTML = rating;
  setMovieListing(rating, "vote_average");
});

 /// While we could just apply the method to the window object,
 /// we don't want to stop rendering of the page with scripts!
 if (document.readyState === "loading") {
  document.addEventListener('DOMContentLoaded', setMovieListing);
 } else {
  setMovieListing();
 }