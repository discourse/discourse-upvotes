import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";

export default class PostVotingCommentEditor extends Component {
  @service siteSettings;

  @tracked value = this.args.raw;
  @tracked submitDisabled = true;

  @action
  updateValue(value) {
    this.value = value;
    this.submitDisabled =
      value.length < this.siteSettings.min_post_length ||
      value.length > this.siteSettings.qa_comment_max_raw_length;
  }

  @action
  onKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      this.saveComment();
    }
  }

  @action
  saveComment() {
    this.submitDisabled = true;

    const data = {
      comment_id: this.args.id,
      raw: this.value,
    };

    return ajax("/post_voting/comments", {
      type: "PUT",
      data,
    })
      .then(this.args.onSave)
      .catch(popupAjaxError)
      .finally(() => {
        this.submitDisabled = false;
      });
  }
}
