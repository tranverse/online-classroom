import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { List, Button, message } from "antd";
import { FileOutlined } from "@ant-design/icons";
import { DocumentService } from "../../services/document.service";

interface ClassDocument {
  id: string;
  name: string;
  type: "file";
  sharedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

const ClassDocuments = () => {
  const { classId } = useParams<{ classId: string }>();
  const [documents, setDocuments] = useState<ClassDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassDocuments();
  }, [classId]);

  const loadClassDocuments = async () => {
    if (!classId) return;

    try {
      setLoading(true);
      const data = await DocumentService.getClassDocuments(classId);
      setDocuments(data);
    } catch (error) {
      message.error("Failed to load class documents");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Class Documents</h1>

      <List
        loading={loading}
        dataSource={documents}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={<FileOutlined />}
              title={item.name}
              description={`Shared by: ${item.sharedBy.name} on ${new Date(
                item.createdAt
              ).toLocaleString()}`}
            />
            <Button onClick={() => DocumentService.downloadFile(item.id)}>
              Download
            </Button>
          </List.Item>
        )}
      />
    </div>
  );
};

export default ClassDocuments;
