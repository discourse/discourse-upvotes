import { Promise } from "rsvp";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";
import { schedule } from "@ember/runloop";
import { inject as service } from "@ember/service";

export default class PostVotingCommentsMenu extends Component {
  @service currentUser;

  @tracked expanded = false;

  @action
  handleSave(comment) {
    this.closeComposer();
    this.args.appendComments([comment]);
  }

  @action
  expandComposer() {
    this.expanded = true;

    this.fetchComments().then(() => {
      schedule("afterRender", () => {
        const textArea = document.querySelector(
          `#post_${this.args.postNumber} .post-voting-comment-composer .post-voting-comment-composer-textarea`
        );
        textArea.focus();
        textArea.select();
      });
    });
  }

  @action
  closeComposer() {
    this.expanded = false;
  }

  @action
  fetchComments() {
    if (!this.args.id) {
      return Promise.resolve();
    }

    const data = {
      post_id: this.args.id,
      last_comment_id: this.args.lastCommentId,
    };

    return ajax("/post_voting/comments", {
      type: "GET",
      data,
    })
      .then((response) => {
        if (response.comments.length > 0) {
          this.args.appendComments(response.comments);
        }
      })
      .catch(popupAjaxError);
  }
}
