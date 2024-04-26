import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(e){
    e.preventDefault();
    console.log('heart it');
    console.log(this);

    axios
      .post(this.action)
      .then(res => {
          const isHearted = this.heart.classList.toggle('heart__button--hearted');
          //console.log(isHearted);
          $('.heart-count').textContent = res.data.hearts.length;
          if(isHearted){
            this.heart.classList.add('heart__button--float');
            setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);
            //remove it afterwards just in case it gets into the way of clicking other elements
          }
      })
      .catch(console.error);

};

export default ajaxHeart;