import { useEffect } from "react";

export default function useFormPersist(key, form) {
  useEffect(() => {
    const data = {
      date: form.date,
      letter_note: form.letter_note,
      to_address: form.to_address,
      bill_number: form.bill_number,
      destination: form.destination,
    };

    localStorage.setItem(key, JSON.stringify(data));
  }, [form.date, form.letter_note, form.to_address, form.bill_number, form.destination]);
}
