# frozen_string_literal: true

Fabricator(:upvotes_vote, class_name: :question_answer_vote) do
  user
  votable(fabricator: :post)
  direction 'up'
end
