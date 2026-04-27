-- D04: Enforce original_item_id != substitute_item_id on Allows_Substitution.
-- MySQL rejects a CHECK constraint that references FK columns (error 3823),
-- so this is implemented as BEFORE INSERT / BEFORE UPDATE triggers instead.

DELIMITER //

CREATE TRIGGER trg_allows_substitution_check_ins
    BEFORE INSERT ON Allows_Substitution
    FOR EACH ROW
BEGIN
    IF NEW.original_item_id = NEW.substitute_item_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'original_item_id and substitute_item_id must be different';
    END IF;
END//

CREATE TRIGGER trg_allows_substitution_check_upd
    BEFORE UPDATE ON Allows_Substitution
    FOR EACH ROW
BEGIN
    IF NEW.original_item_id = NEW.substitute_item_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'original_item_id and substitute_item_id must be different';
    END IF;
END//

DELIMITER ;
