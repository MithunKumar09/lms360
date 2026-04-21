import BlogDetailsOrStudentBlogs from "@/components/layout/main/BlogDetailsOrStudentBlogs";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Blog Details | Edurock - Education LMS Template",
  description: "Blog Details | Edurock - Education LMS Template",
};

const Blog_details = ({ params }) => {
  const { id } = params;
  
  return (
    <PageWrapper>
      <main>
        <BlogDetailsOrStudentBlogs blogId={id} />
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Blog_details;
