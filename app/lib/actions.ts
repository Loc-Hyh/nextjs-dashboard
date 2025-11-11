"use server"

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { z } from 'zod';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';


//Chèn dữ liệu vào csdl 
const sql = postgres(process.env.POSTGES_URL!, { ssl: 'require' });

// khai báo schema zod để xác thực dữ liệu đầu vào
const FormSchema = z.object({
    id: z.string({
      invalid_type_error: 'Please select a customer.', // thông báo lỗi nếu kiểu không hợp lệ
    }),
    customerId: z.string(),
    amount: z.coerce
      .number() // được thiết lập cụ thể để ép buộc (thay đổi) từ chuỗi thành số đồng thời xác thực kiểu của chuỗi.
      .gt(0, { message: 'Please enter an amount greater than $0.' }), // số phải lớn hơn 0
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.', // thông báo lỗi nếu kiểu không hợp lệ
    }),
    date: z.string(),
})

const CreateInvoice =  FormSchema.omit({ id: true, date: true }) // omit: bỏ qua các trường không cần thiết khi tạo hóa đơn mới
const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {

  // const { customerId, amount, status } = CreateInvoice.parse({
  //   customerId: formData.get('customerId'),
  //   amount: formData.get('amount'),
  //   status: formData.get('status'),
  // });

  // xác thực dữ liệu đầu vào
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // nếu xác thực không thành công, trả về lỗi
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100; // Chuyển đổi đô la sang đồng
  const date = new Date().toISOString().split('T')[0]; // Lấy ngày hiện tại ở định dạng YYYY-MM-DD

  // báo lỗi
  try {
    // database insert
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error(error);
    throw new Error('Database Error: Failed to Create Invoice.');
  }

  
  revalidatePath('dashboard/invoices');
  // revalidatePath('/dashboard'); // bộ định tuyến máy khách // cho phép làm mới dữ liệu sau khi hành động máy chủ hoàn tất
  // vô hiệu hóa( một đường dẫn cụ thể ) tạm thời để tránh lỗi định tuyến lặp vô hạn 
  // revalidatePate chỉ hoạt động ở máy chủ / các trang tính được tạo trước

  redirect('/dashboard/invoices'); // chuyển hướng người dùng trở lại trang hóa đơn sau khi tạo thành công


}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
 
  const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    try {
        await sql`
    UPDATE invoices
    SET customer_id = ${customerId},
        amount = ${amountInCents},
        status = ${status}
    WHERE id = ${id}
    `;
    } catch (error) {
      console.error(error);
      throw new Error('Database Error: Failed to Create Invoice.');
    }
    
    
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export default async function deleteInvoice(id: string) {
    //throw new Error('Failed to Delete Invoice');

    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
}


export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}