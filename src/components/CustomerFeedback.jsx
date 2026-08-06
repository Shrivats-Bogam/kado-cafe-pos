import { useState } from "react";
import { Star, MessageSquare, Heart } from "lucide-react";
import { Modal, ModalHeader, PrimaryButton, TextInput } from "./ui.jsx";

export function CustomerFeedback({ tableId, onSubmitFeedback, onClose, t }) {
  const [ratings, setRatings] = useState({ food: 5, service: 5, ambience: 5 });
  const [comment, setComment] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitFeedback({
      tableId,
      foodRating: ratings.food,
      serviceRating: ratings.service,
      ambienceRating: ratings.ambience,
      comment
    });
    onClose();
  };

  const renderStars = (category) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRatings({ ...ratings, [category]: star })}
            className="p-1 hover:scale-110 transition"
          >
            <Star
              size={20}
              className={star <= ratings[category] ? "text-amber-400 fill-amber-400" : "text-stone-700"}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={t.feedbackTitle} icon={Heart} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center bg-stone-950 p-3 rounded-xl border border-stone-800">
            <span className="text-xs font-semibold text-stone-300">{t.foodRating}</span>
            {renderStars("food")}
          </div>
          <div className="flex justify-between items-center bg-stone-950 p-3 rounded-xl border border-stone-800">
            <span className="text-xs font-semibold text-stone-300">{t.serviceRating}</span>
            {renderStars("service")}
          </div>
          <div className="flex justify-between items-center bg-stone-950 p-3 rounded-xl border border-stone-800">
            <span className="text-xs font-semibold text-stone-300">{t.ambienceRating}</span>
            {renderStars("ambience")}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-400 mb-1 block">Comments / Suggestions</label>
          <TextInput
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you loved..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-700 bg-stone-800 text-stone-300 text-xs font-semibold"
          >
            Skip
          </button>
          <PrimaryButton type="submit">
            {t.submitFeedback}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
