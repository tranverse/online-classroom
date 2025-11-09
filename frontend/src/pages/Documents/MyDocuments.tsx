import { FileOutlined, FolderOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, List, Modal, Space, Upload, message } from "antd";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DocumentService } from "../../services/document.service";

interface Document {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  size?: number;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

const MyDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleCreateFolder = async () => {
    try {
      await DocumentService.createFolder({
        name: newFolderName,
        path: currentPath.join("/"),
      });
      message.success("Folder created successfully");
      setCreateFolderVisible(false);
      setNewFolderName("");
      refreshDocuments();
    } catch (error) {
      message.error("Failed to create folder");
    }
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath.join("/"));

    await DocumentService.uploadFile(formData);
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      await DocumentService.deleteItems(selectedItems);
      message.success("Items deleted successfully");
      setSelectedItems([]);
      refreshDocuments();
    } catch (error) {
      message.error("Failed to delete items");
    }
  };

  const refreshDocuments = async () => {
    try {
      const path = currentPath.join("/");
      const data = await DocumentService.listDocuments(path);
      setDocuments(data);
    } catch (error) {
      message.error("Failed to load documents");
    }
  };

  const navigateToFolder = (folder: Document) => {
    setCurrentPath((prev) => [...prev, folder.name]);
  };

  const navigateToBreadcrumb = (index: number) => {
    setCurrentPath((prev) => prev.slice(0, index + 1));
  };

  // load documents when component mounts and whenever currentPath changes
  useEffect(() => {
    refreshDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  return (
    <div className="p-6">
      <div className="mb-4">
        <Breadcrumb>
          <Breadcrumb.Item onClick={() => setCurrentPath([])}>
            Documents
          </Breadcrumb.Item>
          {currentPath.map((path, index) => (
            <Breadcrumb.Item
              key={index}
              onClick={() => navigateToBreadcrumb(index)}
            >
              {path}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      </div>

      <Space className="mb-4">
        <Button type="primary" onClick={() => setCreateFolderVisible(true)}>
          Create Folder
        </Button>
        <Upload
          customRequest={async ({ file, onSuccess, onError }) => {
            try {
              await handleUpload(file as File);
              onSuccess && onSuccess(null);
              message.success("File uploaded successfully");
              // refresh will be triggered by useEffect since currentPath is unchanged
              refreshDocuments();
            } catch (err) {
              onError && onError(err as Error);
              message.error("Failed to upload file");
            }
          }}
          showUploadList={false}
        >
          <Button>Upload File</Button>
        </Upload>
        {selectedItems.length > 0 && (
          <Button danger onClick={handleDelete}>
            Delete Selected
          </Button>
        )}
      </Space>

      <List
        dataSource={documents}
        renderItem={(item) => (
          <List.Item
            className={`cursor-pointer ${
              selectedItems.includes(item.id) ? "bg-gray-100" : ""
            }`}
            onClick={() =>
              item.type === "folder" ? navigateToFolder(item) : null
            }
            onContextMenu={(e) => {
              e.preventDefault();
              const newSelected = selectedItems.includes(item.id)
                ? selectedItems.filter((id) => id !== item.id)
                : [...selectedItems, item.id];
              setSelectedItems(newSelected);
            }}
          >
            <List.Item.Meta
              avatar={
                item.type === "folder" ? <FolderOutlined /> : <FileOutlined />
              }
              title={item.name}
              description={`Last modified: ${new Date(
                item.updatedAt
              ).toLocaleString()}`}
            />
            {item.type === "file" && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  DocumentService.downloadFile(item.id);
                }}
              >
                Download
              </Button>
            )}
          </List.Item>
        )}
      />

      <Modal
        title="Create New Folder"
        open={createFolderVisible}
        onOk={handleCreateFolder}
        onCancel={() => setCreateFolderVisible(false)}
      >
        <input
          className="w-full p-2 border rounded"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Folder name"
        />
      </Modal>
    </div>
  );
};

export default MyDocuments;
