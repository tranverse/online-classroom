import { Modal, Select, message } from "antd";
import { useEffect, useState } from "react";
import { TeacherService } from "../../services/teacher.service";
import { DocumentService } from "../../services/document.service";

interface ShareDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  documentIds: string[];
}

interface Classroom {
  id: string;
  name: string;
}

const ShareDocumentModal = ({
  visible,
  onClose,
  documentIds,
}: ShareDocumentModalProps) => {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTeacherClasses();
    }
  }, [visible]);

  const loadTeacherClasses = async () => {
    try {
      const data = await TeacherService.getTeacherClasses();
      setClasses(data);
    } catch (error) {
      message.error("Failed to load classes");
    }
  };

  const handleShare = async () => {
    if (!selectedClass || documentIds.length === 0) return;

    try {
      setLoading(true);
      await DocumentService.shareDocuments({
        documentIds,
        classId: selectedClass,
      });
      message.success("Documents shared successfully");
      onClose();
    } catch (error) {
      message.error("Failed to share documents");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Share Documents"
      open={visible}
      onOk={handleShare}
      onCancel={onClose}
      confirmLoading={loading}
    >
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Class</label>
        <Select
          className="w-full"
          placeholder="Choose a class"
          value={selectedClass}
          onChange={setSelectedClass}
        >
          {classes.map((classroom) => (
            <Select.Option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </Select.Option>
          ))}
        </Select>
      </div>
    </Modal>
  );
};

export default ShareDocumentModal;
