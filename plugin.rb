# frozen_string_literal: true

# name: discourse-question-answer
# about: Question / Answer Style Topics
# version: 1.6.0
# authors: Angus McLeod, Muhlis Cahyono (muhlisbc@gmail.com)
# url: https://github.com/paviliondev/discourse-question-answer

%i[common desktop mobile].each do |type|
  register_asset "stylesheets/#{type}/question-answer.scss", type
end

enabled_site_setting :qa_enabled

after_initialize do
  %w(
    ../lib/question_answer/engine.rb
    ../lib/question_answer/vote.rb
    ../extensions/category_extension.rb
    ../extensions/guardian_extension.rb
    ../extensions/post_action_type_extension.rb
    ../extensions/post_creator_extension.rb
    ../extensions/post_extension.rb
    ../extensions/post_serializer_extension.rb
    ../extensions/topic_extension.rb
    ../extensions/topic_list_item_serializer_extension.rb
    ../extensions/topic_view_extension.rb
    ../extensions/topic_view_serializer_extension.rb
    ../app/controllers/question_answer/votes_controller.rb
    ../app/models/question_answer_vote.rb
    ../config/routes.rb
  ).each do |path|
    load File.expand_path(path, __FILE__)
  end

  if respond_to?(:register_svg_icon)
    register_svg_icon 'angle-up'
    register_svg_icon 'info'
  end

  %w[
    qa_enabled
    qa_one_to_many
    qa_disable_like_on_answers
    qa_disable_like_on_questions
    qa_disable_like_on_comments
  ].each do |key|
    Category.register_custom_field_type(key, :boolean)
    add_to_serializer(:basic_category, key.to_sym) { object.send(key) }

    if Site.respond_to?(:preloaded_category_custom_fields)
      Site.preloaded_category_custom_fields << key
    end
  end

  class ::Guardian
    attr_accessor :post_opts
    prepend QuestionAnswer::GuardianExtension
  end

  class ::PostCreator
    prepend QuestionAnswer::PostCreatorExtension
  end

  class ::PostSerializer
    attributes :qa_vote_count,
               :qa_enabled

    prepend QuestionAnswer::PostSerializerExtension
  end

  register_post_custom_field_type('vote_history', :json)
  register_post_custom_field_type('vote_count', :integer)

  class ::Post
    include QuestionAnswer::PostExtension
  end

  PostActionType.types[:vote] = 100

  class ::PostActionType
    singleton_class.prepend QuestionAnswer::PostActionTypeExtension
  end

  class ::Topic
    include QuestionAnswer::TopicExtension
  end

  class ::TopicView
    prepend QuestionAnswer::TopicViewExtension
  end

  class ::TopicViewSerializer
    include QuestionAnswer::TopicViewSerializerExtension
  end

  class ::TopicListItemSerializer
    include QuestionAnswer::TopicListItemSerializerExtension
  end

  class ::Category
    include QuestionAnswer::CategoryExtension
  end

  # TODO: Performance of the query degrades as the number of posts a user has voted
  # on increases. We should probably keep a counter cache in the user's
  # custom fields.
  add_to_class(:user, :vote_count) do
    Post.where(user_id: self.id).sum(:qa_vote_count)
  end

  add_to_serializer(:user_card, :vote_count) do
    object.vote_count
  end

  add_to_class(:topic_view, :user_voted_posts) do |user|
    @user_voted_posts ||= begin
      QuestionAnswerVote.where(user: user, post: @posts).distinct.pluck(:post_id)
    end
  end

  add_to_class(:topic_view, :user_voted_posts_last_timestamp) do |user|
    @user_voted_posts_last_timestamp ||= begin
      QuestionAnswerVote
        .where(user: user, post: @posts)
        .group(:post_id, :created_at)
        .pluck(:post_id, :created_at)
    end
  end

  class ::User
    has_many :question_answer_votes
  end

  TopicView.apply_custom_default_scope do |scope, topic_view|
    if topic_view.topic.qa_enabled &&
      !topic_view.instance_variable_get(:@replies_to_post_number) &&
      !topic_view.instance_variable_get(:@post_ids)

      scope
        .unscope(:order)
        .where(
          reply_to_post_number: nil,
          post_type: Post.types[:regular]
        )
        .order("CASE post_number WHEN 1 THEN 0 ELSE 1 END, qa_vote_count DESC, post_number ASC")
    else
      scope
    end
  end

  SiteSetting.enable_filtered_replies_view = true
end
