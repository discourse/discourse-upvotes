import { createWidget } from "discourse/widgets/widget";
import I18n from "I18n";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";

createWidget("qa-comments-menu-composer", {
  tagName: "div.qa-comments-menu-composer",
  buildKey: (attrs) => `qa-comments-menu-composer-${attrs.id}`,

  defaultState() {
    return { value: "", creatingPost: false };
  },

  html(attrs, state) {
    const result = [];

    result.push(this.attach("qa-comment-composer", attrs));

    result.push(
      this.attach("button", {
        action: "submitComment",
        disabled: state.creatingPost,
        contents: I18n.t("qa.post.qa_comment.submit"),
        icon: "reply",
        className: "btn-primary qa-comments-menu-composer-submit",
      })
    );

    result.push(
      this.attach("link", {
        action: "closeComposer",
        className: "qa-comments-menu-composer-cancel",
        contents: () => I18n.t("qa.post.qa_comment.cancel"),
      })
    );

    return result;
  },

  keyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      this.submitComment();
    }
  },

  updateValue(value) {
    this.state.value = value;
  },

  submitComment() {
    this.state.creatingPost = true;

    return ajax("/qa/comments", {
      type: "POST",
      data: { raw: this.state.value, post_id: this.attrs.id },
    })
      .then((response) => {
        this.state.value = "";
        this.sendWidgetAction("closeComposer");
      })
      .catch(popupAjaxError)
      .finally(() => {
        this.state.creatingPost = false;
      });
  },
});
