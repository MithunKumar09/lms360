/**
 * Superadmin Blog Form Component
 * 
 * Form component for creating and editing blogs.
 * Supports rich text content, media uploads, YouTube links, and more.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCreateBlog, useUpdateBlog } from '@/hooks/api/useBlogsMutations';
import RichTextEditor from '@/components/shared/forms/RichTextEditor';
import ImagePicker from '@/components/shared/forms/ImagePicker';
import { extractYouTubeId } from '@/lib/course/transformers';
import { slugify } from '@/lib/utils/slugify';
import { useRouter } from 'next/navigation';

export default function SuperadminBlogForm({ blog = null, mode = 'create', onCancel, onSuccess }) {
  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog();
  const isEditMode = mode === 'edit' && blog;

  // Form state
  const [title, setTitle] = useState(blog?.title || '');
  const [slug, setSlug] = useState(blog?.slug || '');
  const [content, setContent] = useState(blog?.content || '');
  const [excerpt, setExcerpt] = useState(blog?.excerpt || '');
  const [featuredImageUrl, setFeaturedImageUrl] = useState(blog?.featured_image_url || '');
  const [status, setStatus] = useState(blog?.status || 'draft');
  const [scope, setScope] = useState(blog?.scope || 'global');
  const [tags, setTags] = useState(blog?.metadata?.tags?.join(', ') || '');
  const [links, setLinks] = useState(blog?.metadata?.links || []);
  const [youtubeLinks, setYoutubeLinks] = useState(blog?.metadata?.youtubeLinks || []);

  // Link input state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // YouTube link input state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEditMode && title && !slug) {
      const generatedSlug = slugify(title);
      setSlug(generatedSlug);
    }
  }, [title, isEditMode, slug]);

  // Add link
  const handleAddLink = () => {
    if (!linkUrl.trim()) return;

    const newLink = {
      url: linkUrl.trim(),
      title: linkTitle.trim() || linkUrl.trim(),
      description: '',
    };

    setLinks([...links, newLink]);
    setLinkUrl('');
    setLinkTitle('');
  };

  // Remove link
  const handleRemoveLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  // Add YouTube link
  const handleAddYouTubeLink = () => {
    if (!youtubeUrl.trim()) return;

    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      alert('Invalid YouTube URL. Please enter a valid YouTube video URL.');
      return;
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const newYouTubeLink = {
      url: youtubeUrl.trim(),
      embedUrl,
      thumbnail,
      title: youtubeTitle.trim() || 'YouTube Video',
    };

    setYoutubeLinks([...youtubeLinks, newYouTubeLink]);
    setYoutubeUrl('');
    setYoutubeTitle('');
  };

  // Remove YouTube link
  const handleRemoveYouTubeLink = (index) => {
    setYoutubeLinks(youtubeLinks.filter((_, i) => i !== index));
  };

  // Build metadata
  const metadata = useMemo(() => ({
    tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
    links,
    youtubeLinks,
  }), [tags, links, youtubeLinks]);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('Title and content are required.');
      return;
    }

    const blogData = {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      content: content.trim(),
      excerpt: excerpt.trim() || null,
      featured_image_url: featuredImageUrl || null,
      scope,
      status,
      metadata,
    };

    try {
      if (isEditMode) {
        await updateBlog.mutateAsync({ id: blog.id, data: blogData });
      } else {
        await createBlog.mutateAsync(blogData);
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      // Error is handled by mutation hook
    }
  };

  const isLoading = createBlog.isPending || updateBlog.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {isEditMode ? 'Edit Blog' : 'Create New Blog'}
          </h1>
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
            {isEditMode ? 'Update blog details and content' : 'Create a new global blog post'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded-md hover:bg-lightGrey5 dark:hover:bg-lightGrey5-dark transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-whiteColor dark:bg-whiteColor-dark p-6 rounded-lg shadow-sm border border-borderColor dark:border-borderColor-dark space-y-6">
          {/* Title and Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
                placeholder="Enter blog title"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
                placeholder="blog-url-slug"
              />
              <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
                Auto-generated from title if left empty
              </p>
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Excerpt
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
              placeholder="Short description of the blog (optional)"
            />
            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
              Brief summary shown in blog listings
            </p>
          </div>

          {/* Featured Image */}
          <div>
            <ImagePicker
              value={featuredImageUrl}
              onChange={setFeaturedImageUrl}
              label="Featured Image"
              name="featured_image"
              keyPrefix="blogs/featured"
              maxSize={5 * 1024 * 1024} // 5MB
              previewWidth={400}
              previewHeight={225}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your blog content here..."
            />
          </div>

          {/* Scope and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
              >
                <option value="global">Global (Visible to all users)</option>
                <option value="organization">Organization (Visible to org users)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
              placeholder="tag1, tag2, tag3 (comma separated)"
            />
            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
              Separate tags with commas
            </p>
          </div>

          {/* Links Section */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              External Links
            </label>
            <div className="space-y-3">
              {/* Add Link Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Link URL"
                  className="px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
                />
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Link Title (optional)"
                  className="px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors"
                >
                  Add Link
                </button>
              </div>

              {/* Links List */}
              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-lightGrey5 dark:bg-lightGrey5-dark rounded-md"
                    >
                      <div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-primaryColor hover:underline"
                        >
                          {link.title}
                        </a>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
                          {link.url}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* YouTube Links Section */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              YouTube Links
            </label>
            <div className="space-y-3">
              {/* Add YouTube Link Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="YouTube Video URL"
                  className="px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
                />
                <input
                  type="text"
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  placeholder="Video Title (optional)"
                  className="px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
                />
                <button
                  type="button"
                  onClick={handleAddYouTubeLink}
                  className="px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors"
                >
                  Add Video
                </button>
              </div>

              {/* YouTube Links List with Previews */}
              {youtubeLinks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {youtubeLinks.map((ytLink, index) => (
                    <div
                      key={index}
                      className="border border-borderColor dark:border-borderColor-dark rounded-md overflow-hidden"
                    >
                      <div className="relative aspect-video bg-black">
                        <iframe
                          src={ytLink.embedUrl}
                          className="w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                      <div className="p-3 bg-lightGrey5 dark:bg-lightGrey5-dark">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                            {ytLink.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveYouTubeLink(index)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-borderColor dark:border-borderColor-dark rounded-md hover:bg-lightGrey5 dark:hover:bg-lightGrey5-dark transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update Blog' : 'Create Blog'}
          </button>
        </div>
      </form>
    </div>
  );
}
