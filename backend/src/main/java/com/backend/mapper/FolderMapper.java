package com.backend.mapper;

import com.backend.dto.folder.FolderRequest;
import com.backend.dto.folder.FolderResponse;
import com.backend.model.Folder;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FolderMapper {
    Folder toFolder(FolderRequest request);

    FolderResponse toFolderResponse(Folder folder);
}
