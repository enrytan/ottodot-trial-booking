select * from public.trial_class_availability order by id;

select id, student_id, trial_class_id, status from public.bookings where status = 'pending_payment';

insert into public.bookings (student_id, trial_class_id) values (2, 2);

select * from public.trial_class_availability

