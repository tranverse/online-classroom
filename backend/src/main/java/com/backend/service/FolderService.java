package com.backend.service;

import com.backend.dto.folder.FolderRequest;
import com.backend.dto.folder.FolderResponse;
import com.backend.mapper.FolderMapper;
import com.backend.model.Folder;
import com.backend.repository.FolderRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class FolderService {
    FolderRepository folderRepository;
    FolderMapper folderMapper;

    public FolderResponse createFolder(FolderRequest folderRequest) {
        Folder folder = folderMapper.toFolder(folderRequest);
        folderRepository.save(folder);
        return folderMapper.toFolderResponse(folder);
    }

    public FolderResponse updateFolder(FolderRequest folderRequest, String folderId) {
        Folder folder= folderRepository.findById(folderId).orElse(null);
        folder = folderMapper.toFolder(folderRequest);
        return folderMapper.toFolderResponse(folderRepository.save(folder));
    }

    public Void deleteFolder(String folderId) {
        Folder folder = folderRepository.findById(folderId).orElse(null);
        folderRepository.delete(folder);
        return null;
    }

    public FolderResponse getFolder(String folderId) {
        Folder folder = folderRepository.findById(folderId).orElse(null);
        return folderMapper.toFolderResponse(folder);
    }


}
