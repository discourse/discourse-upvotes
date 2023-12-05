# frozen_string_literal: true

module PostVoting
  module GuardianExtension
    def can_edit_comment?(comment)
      return false if !self.user
      return true if comment.user_id == self.user.id
      return true if self.is_admin?
      return true if self.is_moderator?
      false
    end

    def can_delete_comment?(comment)
      can_edit_comment?(comment)
    end

    def can_flag_post_voting_comments?
      return false if self.user.silenced?
      return true if self.user.staff?

      self.user.trust_level >= (SiteSetting.min_trust_to_flag_posts_voting_comments)
      true
    end

    def can_flag_post_voting_comment?(comment)
      if !authenticated? || !comment || comment.trashed? || !comment.user
        return false
      end
      return false if comment.user.staff? && !SiteSetting.allow_flagging_staff
      return false if comment.user_id == @user.id

      can_flag_post_voting_comments?
    end

    def can_flag_post_voting_comment_as?(comment, flag_type_id, opts)
      return false if !is_staff? && (opts[:take_action] || opts[:queue_for_review])

      if flag_type_id == ReviewableScore.types[:notify_user]
        is_warning = ActiveRecord::Type::Boolean.new.deserialize(opts[:is_warning])

        return false if is_warning && !is_staff?
      end

      true
    end

  end
end
