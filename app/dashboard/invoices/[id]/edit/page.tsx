import Form from '@/app/ui/invoices/edit-form';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { fetchCustomers, fetchInvoiceById } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
 
export const metadata : Metadata ={
    title: 'Edit Invoice',
}
export default async function Page(props: { params: Promise<{ id: string }> })
{
  const params = await props.params; // Lấy tham số id từ URL
  const id = params.id; // Lấy id hóa đơn từ tham số
  const [invoice, customers] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
  ]); // Tải đồng thời hóa đơn và khách hàng


  if(!invoice){
    notFound(); // Hiển thị trang 404 nếu không tìm thấy hóa đơn
  }

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          {
            label: 'Edit Invoice',
            href: `/dashboard/invoices/${id}/edit`, // Đường dẫn động đến trang chỉnh sửa hóa đơn
            active: true,
          },
        ]}
      />
      <Form invoice={invoice} customers={customers} /> {/*Truyền dữ liệu hóa đơn và khách hàng vào biểu mẫu chỉnh sửa */}


    </main>
  );
}