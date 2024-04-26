import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(stores){
    return stores.map(store => {
        return `
          <a href="/store/${store.slug}" class="search__result">
            <strong>${store.name}</strong>
          </a>
        `;
    }).join('');
};

function typeAhead(search){
    //console.log(search);
    if(!search) return;

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');

    searchInput.on('input', function(){
      // if there is no value, quit it
      if(!this.value) {
          searchResults.style.display = 'none';
          return;
      }

      // show the search results
      searchResults.style.display = 'block';

      axios
        .get(`/api/search?q=${this.value}`)
        .then(res => {
            //console.log(res.data);
            if(res.data.length) {
                searchResults.innerHTML = dompurify.sanitize(
                    searchResultsHTML(res.data)); // to strip out the onload from image in case someone wants to load any JS on ur web
                return;
            }
            searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for ${this.value} found! </div>`);
        })
        .catch(err => {
            console.error(err);
        });
    });

    // handle keyboard inputs
    searchInput.on('keyup', (e) => {
        // if they are not pressing up, down or enter, do nothing
        if(![38, 40, 13]){
            return;
        }
        const activeClass = 'search__result--active';
        const current = search.querySelector(`.${activeClass}`);
        const items = search.querySelectorAll('.search__result');
        let next;
        if (e.keyCode === 40 && current){
            next = current.nextElementSibling || items[0];
        }
        else if (e.keyCode === 40){
            next = items[0];

        }
        else if (e.keyCode === 38 && current){
            next = current.previousElementSibling || items[items.length - 1]
        }
        else if (e.keyCode === 38) {
            next = items[items.length - 1];
        } 
        else if (e.keyCode === 13 && current.href){
            //console.log('Changing Pages!');
            //console.log(current);
            window.location = current.href;
            return;
        }
        if(current) {
            current.classList.remove(activeClass);
        }
        next.classList.add(activeClass);

    });

};

export default typeAhead;