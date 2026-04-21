import BlogDetails from "@/components/sections/blog-details/BlogDetails";
import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";

const BlogDetailsMain = ({ blogId }) => {
  return (
    <>
      <HeroPrimary path={"Blog page"} title={"Blog Details"} />
      <BlogDetails blogId={blogId} />
    </>
  );
};

export default BlogDetailsMain;
