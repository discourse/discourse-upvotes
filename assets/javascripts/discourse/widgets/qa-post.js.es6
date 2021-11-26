import { createWidget } from "discourse/widgets/widget";
import { removeVote, castVote, whoVoted } from "../lib/qa-utilities";
import { h } from "virtual-dom";
import { smallUserAtts } from "discourse/widgets/actions-summary";
import { iconNode } from "discourse-common/lib/icon-library";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default createWidget("qa-post", {
  tagName: "div.qa-post",
  buildKey: (attrs) => `qa-post-${attrs.post.id}`,

  sendShowLogin() {
    const appRoute = this.register.lookup("route:application");
    appRoute.send("showLogin");
  },

  defaultState() {
    return {
      voters: [],
    };
  },

  html(attrs, state) {
    const contents = [
      this.attach("qa-button", {
        direction: "up",
        voted: attrs.post.qa_user_voted_direction == "up",
      }),
    ];
    const voteCount = attrs.post.qa_vote_count;

    if (voteCount > 0) {
      contents.push(
        this.attach("button", {
          action: "toggleWhoVoted",
          contents: attrs.count,
          className: "qa-post-toggle-voters",
        })
      );

      if (state.voters.length > 0) {
        contents.push(
          h(".qa-post-list", [
            h("span.qa-post-list-icon", iconNode("caret-up")),
            h("span.qa-post-list-count", `${voteCount}`),
            this.attach("small-user-list", {
              users: state.voters,
              listClassName: "qa-post-list-voters",
            }),
          ])
        );

        const countDiff = voteCount - state.voters.length;

        if (countDiff > 0) {
          contents.push(this.attach("span", "and ${countDiff} more users..."));
        }
      }
    } else {
      contents.push(
        h("span.qa-post-toggle-voters", `${attrs.post.qa_vote_count || 0}`)
      );
    }

    contents.push(
      this.attach("qa-button", {
        direction: "down",
        voted: attrs.post.qa_user_voted_direction == "down",
      })
    );

    return contents;
  },

  toggleWhoVoted() {
    const state = this.state;

    if (state.voters.length > 0) {
      state.voters = [];
    } else {
      return this.getWhoVoted();
    }
  },

  clickOutside() {
    if (this.state.voters.length > 0) {
      this.state.voters = [];
      this.scheduleRerender();
    }
  },

  getWhoVoted() {
    const { attrs, state } = this;

    whoVoted({ post_id: attrs.post.id }).then((result) => {
      if (result.voters) {
        state.voters = result.voters.map(smallUserAtts);
        this.scheduleRerender();
      }
    });
  },

  removeVote(direction) {
    const post = this.attrs.post;
    const countChange = direction === "up" ? -1 : 1;

    post.setProperties({
      qa_user_voted_direction: null,
      qa_vote_count: post.qa_vote_count + countChange,
    });

    const voteCount = post.qa_vote_count;

    removeVote({ post_id: post.id }).catch((error) => {
      post.setProperties({
        qa_user_voted_direction: direction,
        qa_vote_count: voteCount - countChange,
      });

      this.scheduleRerender();

      popupAjaxError(error);
    });
  },

  vote(direction) {
    if (!this.currentUser) {
      return this.sendShowLogin();
    }

    const post = this.attrs.post;

    let vote = {
      post_id: post.id,
      direction,
    };

    const countChange = direction === "up" ? 1 : -1;

    this.attrs.post.setProperties({
      qa_user_voted_direction: direction,
      qa_vote_count: post.qa_vote_count + countChange,
    });

    const voteCount = post.qa_vote_count;

    castVote(vote).catch(() => {
      post.setProperties({
        qa_user_voted_direction: null,
        qa_vote_count: voteCount - countChange,
      });

      this.scheduleRerender();

      popupAjaxError(error);
    });
  },
});
